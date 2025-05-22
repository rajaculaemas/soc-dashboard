import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// Tambahkan handler OPTIONS untuk CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

// GET /api/integrations - Mendapatkan semua integrasi
export async function GET() {
  try {
    console.log("GET /api/integrations - Fetching integrations")

    // Periksa apakah tabel ada dengan query raw
    try {
      await prisma.$queryRaw`SELECT 1 FROM "integrations" LIMIT 1`
    } catch (tableError) {
      console.error("Table check error:", tableError)
      // Tabel tidak ada, kembalikan array kosong
      return NextResponse.json([])
    }

    const integrations = await prisma.integration.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    })

    console.log(`Found ${integrations.length} integrations`)
    return NextResponse.json(integrations)
  } catch (error) {
    console.error("Error fetching integrations:", error)
    // Kembalikan array kosong jika terjadi error
    return NextResponse.json([])
  }
}

// POST /api/integrations - Membuat integrasi baru
export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/integrations - Creating new integration")
    const data = await request.json()

    // Validasi data
    if (!data.name || !data.type || !data.source || !data.method) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Pastikan credentials adalah objek
    if (!data.credentials || typeof data.credentials !== "object") {
      data.credentials = {}
    }

    // Periksa apakah tabel ada dengan query raw
    try {
      await prisma.$queryRaw`SELECT 1 FROM "integrations" LIMIT 1`
    } catch (tableError) {
      console.error("Table does not exist, creating schema...")
      // Tabel tidak ada, coba buat schema
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "integrations" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "source" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'disconnected',
          "method" TEXT NOT NULL,
          "description" TEXT,
          "icon" TEXT,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          "last_sync_at" TIMESTAMP WITH TIME ZONE,
          "credentials" JSONB NOT NULL
        )
      `
    }

    const integration = await prisma.integration.create({
      data: {
        name: data.name,
        type: data.type,
        source: data.source,
        method: data.method,
        status: data.status || "disconnected",
        description: data.description,
        icon: data.icon,
        credentials: data.credentials,
      },
    })

    console.log("Integration created:", integration.id)
    return NextResponse.json(integration, { status: 201 })
  } catch (error) {
    console.error("Error creating integration:", error)
    return NextResponse.json({ error: "Failed to create integration" }, { status: 500 })
  }
}
