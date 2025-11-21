import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const integration = await prisma.integration.findUnique({
      where: { id: params.id },
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

    return NextResponse.json({
      success: true,
      data: {
        ...integration,
        type: integration.source,
        method: "api",
        description: "",
        lastSyncAt: integration.lastSync,
      },
    })
  } catch (error) {
    console.error("Error fetching integration:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch integration",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { name, source, credentials, status } = body

    console.log("Updating integration:", params.id)

    const integration = await prisma.integration.update({
      where: { id: params.id },
      data: {
        name,
        source,
        credentials: credentials || {},
        status: status || "connected",
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...integration,
        type: integration.source,
        method: "api",
        description: "",
        lastSyncAt: integration.lastSync,
      },
    })
  } catch (error) {
    console.error("Error updating integration:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update integration",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.integration.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: "Integration deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting integration:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete integration",
      },
      { status: 500 },
    )
  }
}
