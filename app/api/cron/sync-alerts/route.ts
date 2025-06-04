import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from a cron service
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log("Unauthorized cron request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Cron job: Starting scheduled alert sync")

    // Get the base URL for internal API calls
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"

    // Call the auto-sync endpoint
    const response = await fetch(`${baseUrl}/api/alerts/auto-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || "Auto-sync failed")
    }

    console.log("Cron job: Alert sync completed successfully", result)

    return NextResponse.json({
      success: true,
      message: "Scheduled sync completed",
      timestamp: new Date().toISOString(),
      result,
    })
  } catch (error) {
    console.error("Cron job: Error in scheduled sync:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
