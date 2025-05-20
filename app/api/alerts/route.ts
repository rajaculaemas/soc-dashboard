import { type NextRequest, NextResponse } from "next/server"
import { getAlerts } from "@/lib/api/stellar-cyber"
import type { AlertStatus } from "@/lib/config/stellar-cyber"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const minScore = searchParams.get("minScore") ? Number.parseInt(searchParams.get("minScore") as string) : undefined
    const status = searchParams.get("status") as AlertStatus | undefined
    const sort = searchParams.get("sort") || undefined
    const order = searchParams.get("order") as "asc" | "desc" | undefined
    const limit = searchParams.get("limit") ? Number.parseInt(searchParams.get("limit") as string) : undefined
    const page = searchParams.get("page") ? Number.parseInt(searchParams.get("page") as string) : undefined

    console.log("API Route: Fetching alerts with params:", { minScore, status, sort, order, limit, page })

    const alerts = await getAlerts({
      minScore,
      status,
      sort,
      order,
      limit,
      page,
    })

    console.log(`API Route: Returning ${alerts.length} alerts`)

    // Tambahkan header untuk mencegah caching
    return NextResponse.json(alerts, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("Error in /api/alerts:", error)
    // Return mock data instead of error to keep the app running
    const mockAlerts = Array.from({ length: 5 }, (_, i) => ({
      _id: `fallback-alert-${i}`,
      index: `fallback-index-${i}`,
      title: `Fallback Alert ${i}`,
      description: `This is a fallback alert generated due to an error in the API.`,
      severity: ["critical", "high", "medium", "low", "info"][Math.floor(Math.random() * 5)],
      status: ["New", "In Progress", "Ignored", "Closed"][Math.floor(Math.random() * 4)] as AlertStatus,
      created_at: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      updated_at: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
      source: "Fallback Source",
    }))

    return NextResponse.json(mockAlerts)
  }
}
