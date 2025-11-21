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

    console.log("=== FETCHING CASES ===")
    console.log("Integration ID:", integrationId)
    console.log("Time Range:", timeRange)
    console.log("Status Filter:", status)
    console.log("Severity Filter:", severity)

    // Build where clause
    const where: any = {}

    if (integrationId) {
      where.integrationId = integrationId
    }

    if (status && status !== "all") {
      where.status = status
    }

    if (severity && severity !== "all") {
      where.severity = severity
    }

    // Add time range filter - FIXED: Use proper date calculation
    if (timeRange !== "all") {
      const now = new Date()
      let startDate: Date

      switch (timeRange) {
        case "1h":
          startDate = new Date(now.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago
          break
        case "12h":
          startDate = new Date(now.getTime() - 12 * 60 * 60 * 1000) // 12 hours ago
          break
        case "24h":
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago
          break
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
          break
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
          break
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // 90 days ago
          break
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Default 7 days
      }

      where.createdAt = {
        gte: startDate,
        lte: now,
      }

      console.log("Time filter applied:", {
        timeRange,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      })
    }

    console.log("Where clause:", JSON.stringify(where, null, 2))

    // Fetch cases with correct field names
    const cases = await prisma.case.findMany({
      where,
      include: {
        integration: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    console.log(`Found ${cases.length} cases in database`)

    // Log some sample cases for debugging
    if (cases.length > 0) {
      console.log("Sample cases with dates:")
      cases.slice(0, 3).forEach((c, i) => {
        console.log(`  Case ${i + 1}: ${c.name}`)
        console.log(`    Created: ${c.createdAt.toISOString()}`)
        console.log(`    Status: ${c.status}`)
        console.log(`    Severity: ${c.severity}`)
      })
    }

    // Transform cases to include computed fields
    const transformedCases = cases.map((caseItem) => ({
      ...caseItem,
      mttd:
        caseItem.createdAt && caseItem.acknowledgedAt
          ? Math.round((caseItem.acknowledgedAt.getTime() - caseItem.createdAt.getTime()) / (1000 * 60)) // minutes
          : null,
    }))

    // Calculate stats
    const stats = {
      total: cases.length,
      open: cases.filter((c) => c.status?.toLowerCase() === "open" || c.status?.toLowerCase() === "new").length,
      inProgress: cases.filter((c) => c.status?.toLowerCase() === "in progress").length,
      resolved: cases.filter((c) => c.status?.toLowerCase() === "resolved").length,
      critical: cases.filter((c) => c.severity?.toLowerCase() === "critical").length,
      avgMttd:
        transformedCases.length > 0
          ? Math.round(transformedCases.reduce((sum, c) => sum + (c.mttd || 0), 0) / transformedCases.length)
          : 0,
    }

    console.log("Stats:", stats)

    return NextResponse.json({
      success: true,
      data: transformedCases,
      stats,
    })
  } catch (error) {
    console.error("Error in GET /api/cases:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch cases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
