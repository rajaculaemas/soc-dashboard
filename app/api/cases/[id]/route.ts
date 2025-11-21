import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { updateCaseInStellarCyber } from "@/lib/api/stellar-cyber-case"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    console.log("Fetching case details for ID:", id)

    const caseDetail = await prisma.case.findUnique({
      where: { id },
      include: {
        integration: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!caseDetail) {
      return NextResponse.json({
        success: false,
        error: "Case not found",
      })
    }

    console.log("Found case:", caseDetail.name)

    return NextResponse.json({
      success: true,
      data: caseDetail,
    })
  } catch (error) {
    console.error("Error fetching case details:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch case details",
    })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { status, severity, assignee, comment } = body

    console.log("Updating case:", id, { status, severity, assignee, comment })

    // Get current case data to track changes
    const currentCase = await prisma.case.findUnique({
      where: { id },
    })

    if (!currentCase) {
      return NextResponse.json(
        {
          success: false,
          error: "Case not found",
        },
        { status: 404 },
      )
    }

    // Update case in database
    const updatedCase = await prisma.case.update({
      where: { id },
      data: {
        status,
        severity,
        assignee,
        modifiedAt: new Date(),
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

    // Create comment entry for the update
    const changes = []
    if (status && status !== currentCase.status) {
      changes.push(`Status changed from "${currentCase.status}" to "${status}"`)
    }
    if (severity && severity !== currentCase.severity) {
      changes.push(`Severity changed from "${currentCase.severity}" to "${severity}"`)
    }
    if (assignee && assignee !== currentCase.assignee) {
      changes.push(`Assignee changed from "${currentCase.assignee || "Unassigned"}" to "${assignee}"`)
    }

    // Create the comment content
    let commentContent = ""
    if (changes.length > 0) {
      commentContent = changes.join(", ")
    }
    if (comment && comment.trim()) {
      if (commentContent) {
        commentContent += `\n\nComment: ${comment.trim()}`
      } else {
        commentContent = comment.trim()
      }
    }

    // Save comment to database if there are changes or user comment
    if (commentContent) {
      await prisma.caseComment.create({
        data: {
          content: commentContent,
          author: assignee || "system", // Use assignee as author, fallback to system
          caseId: id,
          createdAt: new Date(),
        },
      })
      console.log("Comment saved:", commentContent)
    }

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

      console.log("Stellar Cyber update result:", stellarResult)

      if (!stellarResult.success) {
        console.warn("Failed to update case in Stellar Cyber:", stellarResult.message || "Unknown error")
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
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update case",
      },
      { status: 500 },
    )
  }
}
