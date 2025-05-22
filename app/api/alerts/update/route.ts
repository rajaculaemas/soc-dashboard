import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { updateAlertStatusInStellarCyber } from "@/lib/api/stellar-cyber-client"
import type { AlertStatus } from "@/lib/config/stellar-cyber"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { alertId, status, comments } = body

    if (!alertId || !status) {
      return NextResponse.json({ error: "Missing required fields: alertId or status" }, { status: 400 })
    }

    // Validasi status
    const validStatuses: AlertStatus[] = ["New", "In Progress", "Ignored", "Closed"]
    if (!validStatuses.includes(status as AlertStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 },
      )
    }

    // Cari alert di database
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        integration: true,
      },
    })

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 })
    }

    // Update status di database
    const updatedAlert = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: status as AlertStatus,
        updatedAt: new Date(),
      },
    })

    // Jika alert berasal dari Stellar Cyber, update juga di sana
    if (alert.integration.source === "stellar-cyber" && alert.externalId) {
      try {
        await updateAlertStatusInStellarCyber({
          credentials: alert.integration.credentials,
          alertId: alert.externalId,
          index: alert.index || "",
          status: status as AlertStatus,
          comments,
        })
      } catch (error) {
        console.error("Error updating alert status in Stellar Cyber:", error)
        // Lanjutkan meskipun gagal update di Stellar Cyber
      }
    }

    return NextResponse.json({
      success: true,
      message: "Alert status updated successfully",
      alert: updatedAlert,
    })
  } catch (error) {
    console.error("Error in /api/alerts/update:", error)
    return NextResponse.json({ error: "Failed to update alert status" }, { status: 500 })
  }
}
