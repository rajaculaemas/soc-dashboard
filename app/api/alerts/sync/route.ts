import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { fetchAlertsFromStellarCyber } from "@/lib/api/stellar-cyber-client"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { integrationId } = body

    if (!integrationId) {
      return NextResponse.json({ error: "Missing required field: integrationId" }, { status: 400 })
    }

    // Cari integrasi di database
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    })

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    // Hanya sinkronisasi jika integrasi adalah Stellar Cyber
    if (integration.source !== "stellar-cyber") {
      return NextResponse.json({ error: "Only Stellar Cyber integrations can be synced" }, { status: 400 })
    }

    // Ekstrak kredensial dari database
    const credentials = integration.credentials as Record<string, any>

    // Pastikan format kredensial sesuai dengan yang diharapkan oleh fungsi fetchAlertsFromStellarCyber
    const formattedCredentials = {
      host: credentials.STELLAR_CYBER_HOST || credentials.host,
      user_id: credentials.STELLAR_CYBER_USER_ID || credentials.user_id,
      refresh_token: credentials.STELLAR_CYBER_REFRESH_TOKEN || credentials.refresh_token,
      tenant_id: credentials.STELLAR_CYBER_TENANT_ID || credentials.tenant_id,
    }

    // Ambil alert dari Stellar Cyber
    const stellarAlerts = await fetchAlertsFromStellarCyber(formattedCredentials)

    // Simpan alert ke database
    const savedAlerts = []
    for (const alert of stellarAlerts) {
      // Cek apakah alert sudah ada di database
      const existingAlert = await prisma.alert.findFirst({
        where: {
          externalId: alert._id || alert.stellar_uuid,
          integrationId,
        },
      })

      if (existingAlert) {
        // Update alert yang sudah ada
        const updatedAlert = await prisma.alert.update({
          where: { id: existingAlert.id },
          data: {
            title: alert.title || alert.event_name || "Unknown Alert",
            description: alert.description || alert.xdr_event?.description || "",
            severity: alert.severity || "medium",
            status: alert.status || alert.event_status || "New",
            updatedAt: new Date(),
            score: alert.score || alert.event_score || 0,
            metadata: alert.metadata || {},
          },
        })
        savedAlerts.push(updatedAlert)
      } else {
        // Buat alert baru
        const newAlert = await prisma.alert.create({
          data: {
            externalId: alert._id || alert.stellar_uuid,
            index: alert.index || "",
            title: alert.title || alert.event_name || "Unknown Alert",
            description: alert.description || alert.xdr_event?.description || "",
            severity: alert.severity || "medium",
            status: alert.status || alert.event_status || "New",
            source: alert.source || "Stellar Cyber",
            timestamp: new Date(alert.created_at || alert.timestamp || Date.now()),
            score: alert.score || alert.event_score || 0,
            metadata: alert.metadata || {},
            integrationId,
          },
        })
        savedAlerts.push(newAlert)
      }
    }

    // Update lastSyncAt di integrasi
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        status: "connected",
      },
    })

    return NextResponse.json({
      success: true,
      message: `Synced ${savedAlerts.length} alerts from Stellar Cyber`,
      count: savedAlerts.length,
    })
  } catch (error) {
    console.error("Error in /api/alerts/sync:", error)
    return NextResponse.json({ error: "Failed to sync alerts" }, { status: 500 })
  }
}
