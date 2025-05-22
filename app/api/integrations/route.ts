import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// GET /api/integrations - Mendapatkan semua integrasi
export async function GET() {
  try {
    const integrations = await prisma.integration.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    })

    return NextResponse.json(integrations)
  } catch (error) {
    console.error("Error fetching integrations:", error)
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 })
  }
}

// POST /api/integrations - Membuat integrasi baru
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validasi data
    if (!data.name || !data.type || !data.source || !data.method) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Pastikan credentials adalah objek
    if (!data.credentials || typeof data.credentials !== "object") {
      data.credentials = {}
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

    return NextResponse.json(integration, { status: 201 })
  } catch (error) {
    console.error("Error creating integration:", error)
    return NextResponse.json({ error: "Failed to create integration" }, { status: 500 })
  }
}
