import { type NextRequest, NextResponse } from "next/server"
import type { AlertStatus } from "@/lib/config/stellar-cyber"

// Impor prisma dengan try-catch untuk menangani error saat build
let prisma: any
try {
  prisma = require("@/lib/prisma").default
} catch (error) {
  console.error("Failed to import prisma:", error)
  // Buat mock prisma jika import gagal
  prisma = {
    alert: {
      count: async () => 0,
      findMany: async () => [],
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const minScore = searchParams.get("minScore") ? Number.parseInt(searchParams.get("minScore") as string) : undefined
    const status = searchParams.get("status") as AlertStatus | undefined
    const sort = searchParams.get("sort") || "timestamp"
    const order = (searchParams.get("order") as "asc" | "desc") || "desc"
    const limit = searchParams.get("limit") ? Number.parseInt(searchParams.get("limit") as string) : 100
    const page = searchParams.get("page") ? Number.parseInt(searchParams.get("page") as string) : 1
    const integrationId = searchParams.get("integrationId") || undefined

    // Buat filter
    const where: any = {}

    if (minScore) {
      where.score = { gte: minScore }
    }

    if (status) {
      where.status = status
    }

    if (integrationId) {
      where.integrationId = integrationId
    }

    // Coba ambil data dari database
    try {
      // Hitung total alert
      const totalAlerts = await prisma.alert.count({ where })

      // Ambil alert dengan pagination
      const alerts = await prisma.alert.findMany({
        where,
        orderBy: {
          [sort]: order,
        },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          integration: {
            select: {
              id: true,
              name: true,
              source: true,
            },
          },
        },
      })

      // Tambahkan header untuk mencegah caching
      return NextResponse.json(
        {
          data: alerts,
          pagination: {
            total: totalAlerts,
            page,
            limit,
            pages: Math.ceil(totalAlerts / limit),
          },
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      )
    } catch (dbError) {
      console.error("Database error in /api/alerts:", dbError)

      // Fallback ke data dummy jika database belum siap
      const mockAlerts = Array.from({ length: 5 }, (_, i) => ({
        id: `fallback-alert-${i}`,
        externalId: `fallback-id-${i}`,
        index: `fallback-index-${i}`,
        title: `Fallback Alert ${i}`,
        description: `This is a fallback alert generated due to an error in the database.`,
        severity: ["critical", "high", "medium", "low", "info"][Math.floor(Math.random() * 5)],
        status: ["New", "In Progress", "Ignored", "Closed"][Math.floor(Math.random() * 4)],
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
        source: "Fallback Source",
        score: Math.floor(Math.random() * 100),
        integrationId: "fallback-integration",
        integration: {
          id: "fallback-integration",
          name: "Fallback Integration",
          source: "fallback",
        },
      }))

      return NextResponse.json(
        {
          data: mockAlerts,
          pagination: {
            total: 5,
            page: 1,
            limit: 5,
            pages: 1,
          },
          fallback: true,
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      )
    }
  } catch (error) {
    console.error("Error in /api/alerts:", error)
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 })
  }
}
