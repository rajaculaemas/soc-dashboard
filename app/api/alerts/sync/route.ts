import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getAlerts } from "@/lib/api/stellar-cyber"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { integrationId } = body

    if (!integrationId) {
      return NextResponse.json({ error: "Integration ID is required" }, { status: 400 })
    }

    console.log(`Starting alert sync for integration: ${integrationId}`)

    // Verify integration exists and is active
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    })

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    if (integration.source !== "stellar-cyber") {
      return NextResponse.json({ error: "Only Stellar Cyber integrations are supported" }, { status: 400 })
    }

    if (integration.status !== "connected") {
      return NextResponse.json({ error: "Integration is not connected" }, { status: 400 })
    }

    // Fetch alerts from Stellar Cyber using the specific integration
    const stellarAlerts = await getAlerts({
      limit: 1000, // Increase limit for bulk sync
      integrationId: integrationId,
    })

    console.log(`Fetched ${stellarAlerts.length} alerts from Stellar Cyber`)

    let syncedCount = 0
    let updatedCount = 0
    let errorCount = 0

    // Process each alert
    for (const stellarAlert of stellarAlerts) {
      try {
        // Check if alert already exists
        const existingAlert = await prisma.alert.findFirst({
          where: {
            externalId: stellarAlert._id,
            integrationId: integrationId,
          },
        })

        if (existingAlert) {
          // Update existing alert
          await prisma.alert.update({
            where: { id: existingAlert.id },
            data: {
              title: stellarAlert.title,
              description: stellarAlert.description,
              severity: String(stellarAlert.severity),
              status: stellarAlert.status,
              source: stellarAlert.source,
              score: stellarAlert.score,
              timestamp: new Date(stellarAlert.created_at),
              metadata: stellarAlert.metadata,
              updatedAt: new Date(),
            },
          })
          updatedCount++
        } else {
          // Create new alert
          await prisma.alert.create({
            data: {
              externalId: stellarAlert._id,
              index: stellarAlert.index,
              title: stellarAlert.title,
              description: stellarAlert.description,
              severity: String(stellarAlert.severity),
              status: stellarAlert.status,
              source: stellarAlert.source,
              score: stellarAlert.score,
              timestamp: new Date(stellarAlert.created_at),
              metadata: stellarAlert.metadata,
              integrationId: integrationId,
            },
          })
          syncedCount++
        }
      } catch (alertError) {
        console.error(`Error processing alert ${stellarAlert._id}:`, alertError)
        errorCount++
      }
    }

    // Update integration last sync time
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      },
    })

    console.log(`Sync completed: ${syncedCount} new, ${updatedCount} updated, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      message: "Alerts synced successfully",
      stats: {
        total: stellarAlerts.length,
        synced: syncedCount,
        updated: updatedCount,
        errors: errorCount,
      },
    })
  } catch (error) {
    console.error("Error syncing alerts:", error)
    return NextResponse.json(
      {
        error: "Failed to sync alerts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
