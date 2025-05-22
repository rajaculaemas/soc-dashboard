import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import type { AlertStatus } from "@/lib/config/stellar-cyber"

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
  } catch (error) {
    console.error("Error in /api/alerts:", error)
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 })
  }
}
