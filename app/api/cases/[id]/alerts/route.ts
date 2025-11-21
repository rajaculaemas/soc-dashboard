import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { updateCaseInStellarCyber } from "@/lib/api/stellar-cyber-case"
import { getCaseAlerts } from "@/lib/api/stellar-cyber-case"
import { randomUUID } from "crypto"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = randomUUID()
  console.log(`[${requestId}] Starting request`)

  try {
    const caseId = params.id

    console.log(`[${requestId}] Case ID:`, caseId)

    // Get case details
    const case_ = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        integration: true,
      },
    })

    if (!case_) {
      console.log(`[${requestId}] Case not found`)
      return NextResponse.json(
        {
          success: false,
          error: "Case not found",
        },
        { status: 404 },
      )
    }

    console.log(`[${requestId}] Found case:`, case_.name)
    console.log(`[${requestId}] External ID:`, case_.externalId)
    console.log(`[${requestId}] Integration ID:`, case_.integrationId)

    // Fetch alerts from Stellar Cyber using the external ID
    let alerts = []
    try {
      console.log(`[${requestId}] Fetching alerts for case:`, case_.externalId)
      alerts = await getCaseAlerts({
        caseId: case_.externalId, // Use external ID for Stellar Cyber API
        integrationId: case_.integrationId,
      })
      console.log(`[${requestId}] Successfully fetched ${alerts.length} alerts`)

      if (alerts.length > 0) {
        console.log(`[${requestId}] Sample alert:`, JSON.stringify(alerts[0], null, 2))
      }
    } catch (error) {
      console.error(`[${requestId}] Error fetching alerts from Stellar Cyber:`, error)

      // Check if it's a 401 error and handle gracefully
      if (error instanceof Error && error.message.includes("401")) {
        console.log(`[${requestId}] 401 Unauthorized - this case may not have alerts or user lacks permission`)
      }

      // Return empty alerts instead of error to prevent UI breaking
      alerts = []
    }

    const response = {
      success: true,
      data: {
        alerts,
        case: case_,
      },
    }

    console.log(`[${requestId}] Sending response with ${alerts.length} alerts`)
    return NextResponse.json(response)
  } catch (error) {
    console.error(`[${requestId}] Error fetching case alerts:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch case alerts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { status, severity, assignee, notes } = body

    console.log("Updating case:", id, { status, severity, assignee, notes })

    // Update case in database
    const updatedCase = await prisma.case.update({
      where: { id },
      data: {
        status,
        severity,
        assignee,
        updatedAt: new Date(),
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

    console.log("Case updated successfully:", updatedCase.name)

    // Update case in Stellar Cyber
    try {
      const stellarResult = await updateCaseInStellarCyber({
        caseId: updatedCase.externalId, // Use external ID for Stellar Cyber
        integrationId: updatedCase.integrationId,
        updates: {
          status,
          severity,
          assignee,
        },
      })

      if (!stellarResult.success) {
        console.warn("Failed to update case in Stellar Cyber:", stellarResult.message)
      } else {
        console.log("Successfully updated case in Stellar Cyber")
      }
    } catch (error) {
      console.error("Error updating case in Stellar Cyber:", error)
      // Continue even if Stellar Cyber update fails
    }

    return NextResponse.json({
      success: true,
      data: updatedCase,
    })
  } catch (error) {
    console.error("Error updating case:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to update case",
    })
  }
}
