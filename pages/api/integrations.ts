import type { NextApiRequest, NextApiResponse } from "next"
import prisma from "@/lib/prisma"

// Fallback API route untuk /api/integrations
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Tangani metode GET
  if (req.method === "GET") {
    try {
      console.log("Fallback API: GET /api/integrations - Fetching integrations")

      // Periksa apakah tabel ada dengan query raw
      try {
        await prisma.$queryRaw`SELECT 1 FROM "integrations" LIMIT 1`
      } catch (tableError) {
        console.error("Table check error:", tableError)
        // Tabel tidak ada, kembalikan array kosong
        return res.status(200).json([])
      }

      const integrations = await prisma.integration.findMany({
        orderBy: {
          updatedAt: "desc",
        },
      })

      console.log(`Found ${integrations.length} integrations`)
      return res.status(200).json(integrations)
    } catch (error) {
      console.error("Error fetching integrations:", error)
      // Kembalikan array kosong jika terjadi error
      return res.status(200).json([])
    }
  }

  // Tangani metode POST
  else if (req.method === "POST") {
    try {
      console.log("Fallback API: POST /api/integrations - Creating new integration")
      const data = req.body

      // Validasi data
      if (!data.name || !data.type || !data.source || !data.method) {
        return res.status(400).json({ error: "Missing required fields" })
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
      return res.status(201).json(integration)
    } catch (error) {
      console.error("Error creating integration:", error)
      return res.status(500).json({ error: "Failed to create integration" })
    }
  }

  // Metode tidak didukung
  else {
    res.setHeader("Allow", ["GET", "POST"])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
