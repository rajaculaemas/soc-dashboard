import { type NextRequest, NextResponse } from "next/server"

// Impor prisma dengan try-catch untuk menangani error saat build
let prisma: any
try {
  prisma = require("@/lib/prisma").default
} catch (error) {
  console.error("Failed to import prisma:", error)
  // Buat mock prisma jika import gagal
  prisma = {
    integration: {
      findUnique: async () => null,
      update: async (data: any) => data.data,
      delete: async () => ({}),
    },
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    // Coba ambil data dari database
    try {
      const integration = await prisma.integration.findUnique({
        where: { id },
      })

      if (!integration) {
        return NextResponse.json({ error: "Integration not found" }, { status: 404 })
      }

      return NextResponse.json(integration)
    } catch (dbError) {
      console.error("Database error in GET /api/integrations/[id]:", dbError)

      // Fallback ke data dummy jika database belum siap
      const mockIntegration = {
        id,
        name: "Fallback Integration",
        type: "alert",
        source: "stellar-cyber",
        status: "disconnected",
        method: "api",
        description: "This is a fallback integration generated due to an error in the database.",
        icon: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSyncAt: null,
        credentials: {},
        fallback: true,
      }

      return NextResponse.json(mockIntegration)
    }
  } catch (error) {
    console.error("Error in GET /api/integrations/[id]:", error)
    return NextResponse.json({ error: "Failed to fetch integration" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const data = await request.json()

    // Validasi data
    if (!data.name || !data.type || !data.source || !data.method) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Coba update di database
    try {
      const integration = await prisma.integration.update({
        where: { id },
        data,
      })

      return NextResponse.json(integration)
    } catch (dbError) {
      console.error("Database error in PUT /api/integrations/[id]:", dbError)

      // Fallback jika database belum siap
      return NextResponse.json(
        {
          id,
          ...data,
          updatedAt: new Date().toISOString(),
          fallback: true,
        },
        { status: 200 },
      )
    }
  } catch (error) {
    console.error("Error in PUT /api/integrations/[id]:", error)
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    // Coba hapus dari database
    try {
      await prisma.integration.delete({
        where: { id },
      })

      return NextResponse.json({ success: true })
    } catch (dbError) {
      console.error("Database error in DELETE /api/integrations/[id]:", dbError)

      // Fallback jika database belum siap
      return NextResponse.json({ success: true, fallback: true })
    }
  } catch (error) {
    console.error("Error in DELETE /api/integrations/[id]:", error)
    return NextResponse.json({ error: "Failed to delete integration" }, { status: 500 })
  }
}
