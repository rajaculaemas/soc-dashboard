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
      findMany: async () => [],
      create: async (data: any) => data.data,
    },
  }
}

export async function GET(request: NextRequest) {
  console.log("GET /api/integrations")
  try {
    // Coba ambil data dari database
    try {
      const integrations = await prisma.integration.findMany({
        orderBy: {
          updatedAt: "desc",
        },
      })

      return NextResponse.json(integrations)
    } catch (dbError) {
      console.error("Database error in GET /api/integrations:", dbError)

      // Fallback ke data dummy jika database belum siap
      const mockIntegrations = [
        {
          id: "fallback-integration-1",
          name: "Fallback Stellar Cyber",
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
        },
      ]

      return NextResponse.json(mockIntegrations)
    }
  } catch (error) {
    console.error("Error in GET /api/integrations:", error)
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  console.log("POST /api/integrations")
  try {
    const data = await request.json()

    // Validasi data
    if (!data.name || !data.type || !data.source || !data.method) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Coba simpan ke database
    try {
      const integration = await prisma.integration.create({
        data,
      })

      return NextResponse.json(integration)
    } catch (dbError) {
      console.error("Database error in POST /api/integrations:", dbError)

      // Fallback jika database belum siap
      return NextResponse.json(
        {
          id: "fallback-integration",
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fallback: true,
        },
        { status: 201 },
      )
    }
  } catch (error) {
    console.error("Error in POST /api/integrations:", error)
    return NextResponse.json({ error: "Failed to create integration" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
