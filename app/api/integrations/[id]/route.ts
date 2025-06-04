import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// GET /api/integrations/[id] - Mendapatkan integrasi berdasarkan ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    const integration = await prisma.integration.findUnique({
      where: { id },
    })

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    return NextResponse.json(integration)
  } catch (error) {
    console.error("Error fetching integration:", error)
    return NextResponse.json({ error: "Failed to fetch integration" }, { status: 500 })
  }
}

// PUT /api/integrations/[id] - Memperbarui integrasi
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Perbaikan: Pastikan params.id diakses dengan benar
    const { id } = params
    const data = await request.json()

    // Cek apakah integrasi ada
    const existingIntegration = await prisma.integration.findUnique({
      where: { id },
    })

    if (!existingIntegration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    // Update integrasi
    const updatedIntegration = await prisma.integration.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        type: data.type !== undefined ? data.type : undefined,
        source: data.source !== undefined ? data.source : undefined,
        method: data.method !== undefined ? data.method : undefined,
        status: data.status !== undefined ? data.status : undefined,
        description: data.description !== undefined ? data.description : undefined,
        icon: data.icon !== undefined ? data.icon : undefined,
        credentials: data.credentials !== undefined ? data.credentials : undefined,
        lastSyncAt: data.lastSyncAt !== undefined ? new Date(data.lastSyncAt) : undefined,
      },
    })

    return NextResponse.json(updatedIntegration)
  } catch (error) {
    console.error("Error updating integration:", error)
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 })
  }
}

// DELETE /api/integrations/[id] - Menghapus integrasi
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Perbaikan: Pastikan params.id diakses dengan benar
    const { id } = params

    // Cek apakah integrasi ada
    const existingIntegration = await prisma.integration.findUnique({
      where: { id },
    })

    if (!existingIntegration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    // Hapus integrasi
    await prisma.integration.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting integration:", error)
    return NextResponse.json({ error: "Failed to delete integration" }, { status: 500 })
  }
}
