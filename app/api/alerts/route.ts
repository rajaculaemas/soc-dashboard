import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const status = searchParams.get("status")
    const severity = searchParams.get("severity")
    const source = searchParams.get("source")

    // Build where clause based on filters
    const where: any = {}

    if (from) {
      where.timestamp = {
        gte: new Date(from),
      }
    }

    if (status && status !== "all") {
      where.status = status
    }

    if (severity && severity !== "all") {
      where.severity = severity
    }

    if (source && source !== "all") {
      where.source = source
    }

    console.log("Fetching alerts with filters:", where)

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        integration: {
          select: {
            name: true,
            source: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 1000, // Limit to prevent performance issues
    })

    console.log(`Found ${alerts.length} alerts`)

    return NextResponse.json({
      alerts: alerts.map((alert) => ({
        id: alert.id,
        _id: alert.externalId,
        index: alert.index,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        status: alert.status,
        source: alert.source,
        score: alert.score,
        timestamp: alert.timestamp.toISOString(),
        created_at: alert.createdAt.toISOString(),
        updated_at: alert.updatedAt.toISOString(),
        metadata: alert.metadata,
        integration: alert.integration,
      })),
    })
  } catch (error) {
    console.error("Error fetching alerts:", error)
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 })
  }
}
