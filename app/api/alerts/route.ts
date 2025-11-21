import { type NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const integrationId = searchParams.get("integrationId")
    const timeRange = searchParams.get("time_range") || "7d"
    const status = searchParams.get("status")
    const severity = searchParams.get("severity")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = (page - 1) * limit

    console.log("=== FETCHING ALERTS ===")
    console.log("Integration ID:", integrationId)
    console.log("Time Range:", timeRange)
    console.log("Status Filter:", status)
    console.log("Severity Filter:", severity)
    console.log("Page:", page, "Limit:", limit)

    // Calculate time range
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case "1d":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Build where clause
    const whereClause: any = {
      timestamp: {
        gte: startDate,
      },
    }

    if (integrationId && integrationId !== "all") {
      whereClause.integrationId = integrationId
    }

    if (status && status !== "all") {
      whereClause.status = status
    }

    if (severity && severity !== "all") {
      whereClause.severity = severity
    }

    console.log("Where clause:", JSON.stringify(whereClause, null, 2))

    // Fetch alerts with pagination
    const [alerts, totalCount] = await Promise.all([
      prisma.alert.findMany({
        where: whereClause,
        include: {
          integration: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          timestamp: "desc",
        },
        skip: offset,
        take: limit,
      }),
      prisma.alert.count({
        where: whereClause,
      }),
    ])

    console.log("Found", alerts.length, "alerts out of", totalCount, "total")

    // Calculate statistics
    const stats = await prisma.alert.aggregate({
      where: whereClause,
      _count: {
        id: true,
      },
    })

    const statusStats = await prisma.alert.groupBy({
      by: ["status"],
      where: whereClause,
      _count: {
        id: true,
      },
    })

    const severityStats = await prisma.alert.groupBy({
      by: ["severity"],
      where: whereClause,
      _count: {
        id: true,
      },
    })

    // Format statistics
    const formattedStats = {
      total: stats._count.id,
      open: statusStats.find((s) => s.status === "Open")?._count.id || 0,
      inProgress: statusStats.find((s) => s.status === "In Progress")?._count.id || 0,
      resolved: statusStats.find((s) => s.status === "Resolved")?._count.id || 0,
      closed: statusStats.find((s) => s.status === "Closed")?._count.id || 0,
      critical: severityStats.find((s) => s.severity === "Critical")?._count.id || 0,
      high: severityStats.find((s) => s.severity === "High")?._count.id || 0,
      medium: severityStats.find((s) => s.severity === "Medium")?._count.id || 0,
      low: severityStats.find((s) => s.severity === "Low")?._count.id || 0,
    }

    console.log("Stats:", formattedStats)

    return NextResponse.json({
      success: true,
      data: alerts,
      stats: formattedStats,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching alerts:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch alerts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, severity, status, integrationId, metadata } = body

    console.log("Creating new alert:", { name, severity, status, integrationId })

    // Validate required fields
    if (!name || !integrationId) {
      return NextResponse.json({ success: false, error: "Name and integration ID are required" }, { status: 400 })
    }

    // Check if integration exists
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    })

    if (!integration) {
      return NextResponse.json({ success: false, error: "Integration not found" }, { status: 404 })
    }

    // Create alert
    const alert = await prisma.alert.create({
      data: {
        externalId: (body.externalId as string) || '',
        title: name,
        description: description || "",
        severity: severity || "Medium",
        status: status || "Open",
        timestamp: new Date(),
        integrationId,
        metadata: metadata || {},
      },
      include: {
        integration: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    console.log("Created alert:", alert.id)

    return NextResponse.json({
      success: true,
      data: alert,
      message: "Alert created successfully",
    })
  } catch (error) {
    console.error("Error creating alert:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create alert",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
