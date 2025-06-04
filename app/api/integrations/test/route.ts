import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { testStellarCyberConnection } from "@/lib/api/stellar-cyber-client"

// POST /api/integrations/test - Menguji koneksi integrasi
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log("Testing integration with data:", {
      id: data.id || "not provided",
      source: data.source || "not provided",
      hasCredentials: data.credentials ? "yes" : "no",
    })

    // Jika ID disediakan, ambil integrasi dari database
    if (data.id) {
      console.log(`Looking for integration with ID: ${data.id}`)
      const integration = await prisma.integration.findUnique({
        where: { id: data.id },
      })

      if (!integration) {
        console.log(`Integration with ID ${data.id} not found`)
        return NextResponse.json({ error: "Integration not found" }, { status: 404 })
      }

      console.log("Found integration:", {
        id: integration.id,
        name: integration.name,
        source: integration.source,
        hasCredentials: integration.credentials ? "yes" : "no",
      })

      // Uji koneksi berdasarkan jenis integrasi
      if (integration.source === "stellar-cyber") {
        // Ekstrak kredensial dari database
        let credentials: Record<string, any> = {}

        // Cek apakah kredensial adalah array atau objek
        if (Array.isArray(integration.credentials)) {
          console.log("Credentials are in array format, converting to object format...")
          const credentialsArray = integration.credentials as any[]
          credentialsArray.forEach((cred) => {
            if (cred && typeof cred === "object" && "key" in cred && "value" in cred) {
              credentials[cred.key] = cred.value
            }
          })
        } else {
          credentials = integration.credentials as Record<string, any>
        }

        console.log("Credentials keys:", Object.keys(credentials))

        // Pastikan format kredensial sesuai dengan yang diharapkan oleh fungsi testStellarCyberConnection
        const formattedCredentials = {
          host: credentials.host || credentials.STELLAR_CYBER_HOST || "",
          user_id: credentials.user_id || credentials.STELLAR_CYBER_USER_ID || "",
          refresh_token: credentials.refresh_token || credentials.STELLAR_CYBER_REFRESH_TOKEN || "",
          tenant_id: credentials.tenant_id || credentials.STELLAR_CYBER_TENANT_ID || "",
        }

        console.log("Testing Stellar Cyber connection with credentials:", {
          host: formattedCredentials.host ? "provided" : "missing",
          user_id: formattedCredentials.user_id ? "provided" : "missing",
          refresh_token: formattedCredentials.refresh_token ? "provided" : "missing",
          tenant_id: formattedCredentials.tenant_id ? "provided" : "missing",
        })

        const result = await testStellarCyberConnection(formattedCredentials)
        console.log("Test result:", result)

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
      console.log("Testing Stellar Cyber connection with provided credentials")

      // Pastikan format kredensial sesuai dengan yang diharapkan oleh fungsi testStellarCyberConnection
      const formattedCredentials = {
        host: data.credentials.host || data.credentials.STELLAR_CYBER_HOST || "",
        user_id: data.credentials.user_id || data.credentials.STELLAR_CYBER_USER_ID || "",
        refresh_token: data.credentials.refresh_token || data.credentials.STELLAR_CYBER_REFRESH_TOKEN || "",
        tenant_id: data.credentials.tenant_id || data.credentials.STELLAR_CYBER_TENANT_ID || "",
      }

      console.log("Formatted credentials:", {
        host: formattedCredentials.host ? "provided" : "missing",
        user_id: formattedCredentials.user_id ? "provided" : "missing",
        refresh_token: formattedCredentials.refresh_token ? "provided" : "missing",
        tenant_id: formattedCredentials.tenant_id ? "provided" : "missing",
      })

      const result = await testStellarCyberConnection(formattedCredentials)
      console.log("Test result:", result)
      return NextResponse.json(result)
    }

    console.log("Missing required parameters for testing integration")
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  } catch (error) {
    console.error("Error testing integration:", error)
    return NextResponse.json({ error: "Failed to test integration" }, { status: 500 })
  }
}
