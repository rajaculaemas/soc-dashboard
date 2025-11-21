import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCases } from "@/lib/api/stellar-cyber-case"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { integrationId } = body

    if (!integrationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Integration ID is required",
        },
        { status: 400 },
      )
    }

    console.log("=== SYNCING CASES ===")
    console.log("Integration ID:", integrationId)

    // Get integration details
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    })

    if (!integration) {
      return NextResponse.json(
        {
          success: false,
          error: "Integration not found",
        },
        { status: 404 },
      )
    }

    console.log("Found integration:", integration.name)

    // Fetch cases from Stellar Cyber
    console.log("Fetching cases from Stellar Cyber...")
    const stellarCases = await getCases({
      integrationId,
      limit: 1000,
    })

    console.log(`Retrieved ${stellarCases.length} cases from Stellar Cyber`)

    // Log some sample cases to see their status
    if (stellarCases.length > 0) {
      console.log("Sample cases from Stellar Cyber:")
      stellarCases.slice(0, 3).forEach((c, i) => {
        console.log(`  ${i + 1}. ${c._id} - ${c.name} - Status: ${c.status} - Modified: ${c.modified_at}`)
      })
    }

    let syncedCount = 0
    let updatedCount = 0
    let errorCount = 0
    const skippedCount = 0

    // Process each case
    for (const stellarCase of stellarCases) {
      try {
        console.log(`\n--- Processing case: ${stellarCase._id} ---`)
        console.log(`Name: ${stellarCase.name}`)
        console.log(`Status from Stellar: ${stellarCase.status}`)
        console.log(`Assignee from Stellar: ${stellarCase.assignee} (${stellarCase.assignee_name})`)
        console.log(`Modified at: ${stellarCase.modified_at}`)

        // Check if case already exists
        const existingCase = await prisma.case.findFirst({
          where: {
            OR: [{ externalId: stellarCase._id }, { ticketId: stellarCase.ticket_id }],
          },
        })

        if (existingCase) {
          console.log(`Found existing case in DB:`)
          console.log(`  DB Status: ${existingCase.status}`)
          console.log(`  DB Assignee: ${existingCase.assignee} (${existingCase.assigneeName})`)
          console.log(`  DB Modified: ${existingCase.modifiedAt}`)
        }

        // Prepare case data with all fields that might change
        const caseData = {
          externalId: stellarCase._id,
          ticketId: stellarCase.ticket_id || 0,
          name: stellarCase.name || "Unnamed Case",
          status: stellarCase.status || "New",
          severity: stellarCase.severity || "Medium",
          assignee: stellarCase.assignee || null,
          assigneeName: stellarCase.assignee_name || null,
          description: stellarCase.description || stellarCase.name || "No description",
          createdAt: stellarCase.created_at ? new Date(stellarCase.created_at) : new Date(),
          modifiedAt: stellarCase.modified_at ? new Date(stellarCase.modified_at) : new Date(),
          acknowledgedAt: stellarCase.acknowledged ? new Date(stellarCase.acknowledged) : null,
          closedAt: stellarCase.closed ? new Date(stellarCase.closed) : null,
          startTimestamp: stellarCase.start_timestamp ? new Date(stellarCase.start_timestamp) : null,
          endTimestamp: stellarCase.end_timestamp ? new Date(stellarCase.end_timestamp) : null,
          score: stellarCase.score || 0,
          size: stellarCase.size || 1,
          tags: stellarCase.tags || [],
          version: stellarCase.version || 1,
          createdBy: stellarCase.created_by || null,
          createdByName: stellarCase.created_by_name || null,
          modifiedBy: stellarCase.modified_by || null,
          modifiedByName: stellarCase.modified_by_name || null,
          custId: stellarCase.cust_id || null,
          tenantName: stellarCase.tenant_name || null,
          metadata: stellarCase,
          integrationId: integrationId,
        }

        if (existingCase) {
          // Check if there are any changes
          const hasChanges =
            existingCase.status !== caseData.status ||
            existingCase.severity !== caseData.severity ||
            existingCase.assignee !== caseData.assignee ||
            existingCase.assigneeName !== caseData.assigneeName ||
            existingCase.name !== caseData.name ||
            existingCase.version !== caseData.version

          console.log(`Changes detected: ${hasChanges}`)
          if (hasChanges) {
            console.log(`  Status: ${existingCase.status} -> ${caseData.status}`)
            console.log(`  Severity: ${existingCase.severity} -> ${caseData.severity}`)
            console.log(`  Assignee: ${existingCase.assignee} -> ${caseData.assignee}`)
            console.log(`  AssigneeName: ${existingCase.assigneeName} -> ${caseData.assigneeName}`)
            console.log(`  Version: ${existingCase.version} -> ${caseData.version}`)
          }

          // Always update existing case with latest data from Stellar Cyber
          console.log(`Updating existing case: ${stellarCase._id}`)

          const updatedCase = await prisma.case.update({
            where: { id: existingCase.id },
            data: {
              // Update all fields that might change
              name: caseData.name,
              status: caseData.status,
              severity: caseData.severity,
              assignee: caseData.assignee,
              assigneeName: caseData.assigneeName,
              description: caseData.description,
              modifiedAt: caseData.modifiedAt,
              acknowledgedAt: caseData.acknowledgedAt,
              closedAt: caseData.closedAt,
              startTimestamp: caseData.startTimestamp,
              endTimestamp: caseData.endTimestamp,
              score: caseData.score,
              size: caseData.size,
              tags: caseData.tags,
              version: caseData.version,
              modifiedBy: caseData.modifiedBy,
              modifiedByName: caseData.modifiedByName,
              custId: caseData.custId,
              tenantName: caseData.tenantName,
              metadata: caseData.metadata,
            },
          })

          updatedCount++
          console.log(`? Updated case: ${stellarCase._id}`)
          console.log(`  New status in DB: ${updatedCase.status}`)
          console.log(`  New assignee in DB: ${updatedCase.assignee}`)
        } else {
          // Create new case
          console.log(`Creating new case: ${stellarCase._id}`)
          const newCase = await prisma.case.create({
            data: caseData,
          })
          syncedCount++
          console.log(`? Created new case: ${stellarCase._id} with status: ${newCase.status}`)
        }
      } catch (caseError) {
        console.error(`? Error processing case ${stellarCase._id}:`, caseError)
        errorCount++
      }
    }

    // Update integration last sync time
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        lastSync: new Date(),
      },
    })

    console.log(`\n?? Sync completed:`)
    console.log(`  - ${syncedCount} new cases created`)
    console.log(`  - ${updatedCount} existing cases updated`)
    console.log(`  - ${errorCount} errors encountered`)
    console.log(`  - ${skippedCount} cases skipped`)

    // Verify the sync by checking some cases in the database
    console.log(`\n--- Verification: Checking database after sync ---`)
    const dbCases = await prisma.case.findMany({
      where: { integrationId },
      take: 5,
      orderBy: { modifiedAt: "desc" },
    })

    console.log(`Found ${dbCases.length} cases in database:`)
    dbCases.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.externalId} - ${c.name} - Status: ${c.status} - Modified: ${c.modifiedAt}`)
    })

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      updated: updatedCount,
      errors: errorCount,
      total: stellarCases.length,
      stats: {
        synced: syncedCount,
        updated: updatedCount,
        errors: errorCount,
        skipped: skippedCount,
      },
    })
  } catch (error) {
    console.error("Error syncing cases:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync cases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  // Allow GET method for testing
  return NextResponse.json({
    message: "Use POST method to sync cases",
    endpoint: "/api/cases/sync",
    method: "POST",
    body: {
      integrationId: "string",
    },
  })
}
