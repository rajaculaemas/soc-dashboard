import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { testStellarCyberConnection } from "@/lib/api/stellar-cyber-client"

// POST /api/integrations/test - Menguji koneksi integrasi
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Jika ID disediakan, ambil integrasi dari database
    if (data.id) {
      const integration = await prisma.integration.findUnique({
        where: { id: data.id },
      })

      if (!integration) {
        return NextResponse.json({ error: "Integration not found" }, { status: 404 })
      }

      // Uji koneksi berdasarkan jenis integrasi
      if (integration.source === "stellar-cyber") {
        // Ekstrak kredensial dari database
        const credentials = integration.credentials as Record<string, any>

        // Pastikan format kredensial sesuai dengan yang diharapkan oleh fungsi testStellarCyberConnection
        const formattedCredentials = {
          host: credentials.STELLAR_CYBER_HOST || credentials.host,
          user_id: credentials.STELLAR_CYBER_USER_ID || credentials.user_id,
          refresh_token: credentials.STELLAR_CYBER_REFRESH_TOKEN || credentials.refresh_token,
          tenant_id: credentials.STELLAR_CYBER_TENANT_ID || credentials.tenant_id,
        }

        const result = await testStellarCyberConnection(formattedCredentials)

        // Update status integrasi
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            status: result.success ? "connected" : "error",
            lastSyncAt: result.success ? new Date() : undefined,
          },
        })

        return NextResponse.json(result)
      }

      // Tambahkan logika untuk jenis integrasi lainnya di sini

      return NextResponse.json({ error: "Unsupported integration type" }, { status: 400 })
    }

    // Jika tidak ada ID, uji koneksi dengan kredensial yang diberikan
    if (data.source === "stellar-cyber" && data.credentials) {
      // Pastikan format kredensial sesuai dengan yang diharapkan oleh fungsi testStellarCyberConnection
      const formattedCredentials = {
        host: data.credentials.STELLAR_CYBER_HOST || data.credentials.host,
        user_id: data.credentials.STELLAR_CYBER_USER_ID || data.credentials.user_id,
        refresh_token: data.credentials.STELLAR_CYBER_REFRESH_TOKEN || data.credentials.refresh_token,
        tenant_id: data.credentials.STELLAR_CYBER_TENANT_ID || data.credentials.tenant_id,
      }

      const result = await testStellarCyberConnection(formattedCredentials)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  } catch (error) {
    console.error("Error testing integration:", error)
    return NextResponse.json({ error: "Failed to test integration" }, { status: 500 })
  }
}
