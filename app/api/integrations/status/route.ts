import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    // Mengambil semua integrasi dari database
    const integrations = await prisma.integration.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    })

    // Menyusun response yang hanya berisi ID dan status
    const statusData = integrations.map((integration) => ({
      id: integration.id,
      status: integration.status,
      lastSyncAt: integration.lastSyncAt,
    }))

    return NextResponse.json(statusData)
  } catch (error) {
    console.error("Error fetching integrations status:", error)
    return NextResponse.json({ error: "Failed to fetch integrations status" }, { status: 500 })
  }
}