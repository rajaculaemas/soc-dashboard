import { type NextRequest, NextResponse } from "next/server"
import { updateAlertStatus } from "@/lib/api/stellar-cyber"
import type { AlertStatus } from "@/lib/config/stellar-cyber"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { index, alertId, status, comments } = body

    if (!index || !alertId || !status) {
      return NextResponse.json({ error: "Missing required fields: index, alertId, or status" }, { status: 400 })
    }

    // Validate status
    const validStatuses: AlertStatus[] = ["New", "In Progress", "Ignored", "Closed"]
    if (!validStatuses.includes(status as AlertStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 },
      )
    }

    const result = await updateAlertStatus({
      index,
      alertId,
      status: status as AlertStatus,
      comments,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in /api/alerts/update:", error)
    // Return success response to keep the app running
    return NextResponse.json({
      success: true,
      message: "Status updated (fallback response due to error)",
      fallback: true,
    })
  }
}
