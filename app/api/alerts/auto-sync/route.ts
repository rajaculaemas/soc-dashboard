import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST() {
  try {
    console.log("Starting auto-sync for all active Stellar Cyber integrations")

    // Get all active Stellar Cyber integrations
    const integrations = await prisma.integration.findMany({
      where: {
        source: "stellar-cyber",
        status: "connected",
      },
    })

    if (integrations.length === 0) {
      return NextResponse.json({
        message: "No active Stellar Cyber integrations found",
        synced: 0,
      })
    }

    const syncResults = []

    // Sync each integration
    for (const integration of integrations) {
      try {
        console.log(`Auto-syncing integration: ${integration.name} (${integration.id})`)

        // Call the sync endpoint for this integration
        const syncResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/alerts/sync`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              integrationId: integration.id,
            }),
          },
        )

        const syncResult = await syncResponse.json()

        syncResults.push({
          integrationId: integration.id,
          integrationName: integration.name,
          success: syncResponse.ok,
          stats: syncResult.stats || null,
          error: syncResponse.ok ? null : syncResult.error,
        })
      } catch (error) {
        console.error(`Error auto-syncing integration ${integration.id}:`, error)
        syncResults.push({
          integrationId: integration.id,
          integrationName: integration.name,
          success: false,
          stats: null,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    const successCount = syncResults.filter((r) => r.success).length
    const totalStats = syncResults.reduce(
      (acc, result) => {
        if (result.stats) {
          acc.total += result.stats.total || 0
          acc.synced += result.stats.synced || 0
          acc.updated += result.stats.updated || 0
          acc.errors += result.stats.errors || 0
        }
        return acc
      },
      { total: 0, synced: 0, updated: 0, errors: 0 },
    )

    console.log(`Auto-sync completed: ${successCount}/${integrations.length} integrations synced`)

    return NextResponse.json({
      message: `Auto-sync completed for ${successCount}/${integrations.length} integrations`,
      totalStats,
      results: syncResults,
    })
  } catch (error) {
    console.error("Error in auto-sync:", error)
    return NextResponse.json(
      {
        error: "Auto-sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
