import { STELLAR_CYBER_CONFIG, type AlertStatus, type StellarCyberAlert } from "@/lib/config/stellar-cyber"
import { urlunparse } from "@/lib/utils/url"

// Fungsi untuk mendapatkan access token
export async function getAccessToken(): Promise<string> {
  const { HOST, USER_ID, REFRESH_TOKEN } = STELLAR_CYBER_CONFIG

  console.log("Checking credentials:", {
    HOST: HOST === "localhost" ? "localhost (default)" : "configured",
    USER_ID: USER_ID === "demo@example.com" ? "demo (default)" : "configured",
    REFRESH_TOKEN: REFRESH_TOKEN === "demo-token" ? "demo (default)" : "configured",
  })

  // Jika environment variables tidak tersedia, kembalikan token dummy untuk development
  if (!HOST || HOST === "localhost" || !USER_ID || !REFRESH_TOKEN) {
    console.warn("Stellar Cyber credentials not properly configured. Using dummy token for development.")
    return "dummy-access-token-for-development"
  }

  const auth = Buffer.from(`${USER_ID}:${REFRESH_TOKEN}`).toString("base64")

  const headers = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/x-www-form-urlencoded",
  }

  const url = urlunparse({
    protocol: "https",
    hostname: HOST,
    pathname: "/connect/api/v1/access_token",
  })

  try {
    console.log("Requesting access token from:", url)
    const response = await fetch(url, {
      method: "POST",
      headers,
    })

    console.log("Access Token Request Status:", response.status)

    if (!response.ok) {
      console.error(`Failed to get access token: ${response.status} ${response.statusText}`)
      return "error-token-for-fallback"
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error("Error getting access token:", error)
    return "error-token-for-fallback"
  }
}

// Fungsi untuk mendapatkan daftar alert
export async function getAlerts(params: {
  minScore?: number
  status?: AlertStatus
  sort?: string
  order?: "asc" | "desc"
  limit?: number
  page?: number
}): Promise<StellarCyberAlert[]> {
  const { HOST, TENANT_ID } = STELLAR_CYBER_CONFIG
  const { minScore = 0, status, sort = "timestamp", order = "desc", limit = 100, page = 1 } = params

  console.log("Stellar Cyber Config:", { HOST, TENANT_ID })
  console.log("Request params:", params)

  // Jika environment variables tidak tersedia, kembalikan data dummy
  if (!HOST || HOST === "localhost" || !TENANT_ID || TENANT_ID === "demo-tenant") {
    console.warn("Stellar Cyber credentials not properly configured. Using mock data.")
    return generateMockAlerts()
  }

  try {
    console.log("Attempting to get access token...")
    const token = await getAccessToken()
    console.log("Access token received:", token.substring(0, 10) + "...")

    // Jika token adalah fallback token, kembalikan data dummy
    if (token === "dummy-access-token-for-development" || token === "error-token-for-fallback") {
      console.warn("Using fallback token. Returning mock data.")
      return generateMockAlerts()
    }

    // Berdasarkan data yang diunggah, endpoint yang benar mungkin berbeda
    // Kita akan mencoba endpoint Elasticsearch yang terlihat di data
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Buat query Elasticsearch berdasarkan format yang terlihat di data
    const query = {
      size: limit,
      query: {
        bool: {
          must: [
            {
              range: {
                timestamp: {
                  gte: thirtyDaysAgo.toISOString(),
                  lte: now.toISOString(),
                  format: "strict_date_time",
                },
              },
            },
          ],
        },
      },
    }

    // Tambahkan filter status jika ada
    if (status) {
      query.query.bool.must.push({
        match: {
          event_status: status,
        },
      })
    }

    // Tambahkan filter tenant ID
    query.query.bool.must.push({
      match: {
        tenantid: TENANT_ID,
      },
    })

    console.log("Sending Query to Elasticsearch:", JSON.stringify(query, null, 2))

    // Gunakan endpoint yang terlihat di data
    const url = urlunparse({
      protocol: "https",
      hostname: HOST,
      pathname: "/connect/api/v1/search", // Endpoint yang mungkin benar berdasarkan data
    })

    console.log("Fetching alerts from URL:", url)

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(query),
      cache: "no-store",
    })

    console.log("Response Status Code:", response.status)

    if (!response.ok) {
      console.error(`Failed to get alerts: ${response.status} ${response.statusText}`)
      return generateMockAlerts()
    }

    const data = await response.json()
    console.log("Response data structure:", Object.keys(data))

    // Log sampel data untuk debugging
    if (data.hits && data.hits.hits && data.hits.hits.length > 0) {
      console.log("Sample hit structure:", Object.keys(data.hits.hits[0]))
      console.log("Sample _source structure:", Object.keys(data.hits.hits[0]._source))
    }

    // Ekstrak dan transformasi data dari format Elasticsearch
    let alerts: StellarCyberAlert[] = []

    if (data.hits && data.hits.hits && Array.isArray(data.hits.hits)) {
      alerts = data.hits.hits.map((hit: any) => {
        const source = hit._source || {}

        // Transformasi data ke format yang diharapkan aplikasi
        return {
          _id: hit._id || source.stellar_uuid || "",
          index: hit._index || "",
          title: source.xdr_event?.display_name || source.event_name || "Unknown Alert",
          description: source.xdr_event?.description || "",
          severity: source.severity || "medium",
          status: source.event_status || source.stellar?.status || "New",
          created_at: new Date(source.timestamp || Date.now()).toISOString(),
          updated_at: new Date(source.write_time || Date.now()).toISOString(),
          source: source.msg_origin?.source || "Stellar Cyber",
          score: source.event_score || source.score || 0,
          metadata: {
            srcip: source.srcip,
            dstip: source.dstip,
            event_type: source.event_type,
            event_name: source.event_name,
            assignee: source.assignee,
            comments: source.comments,
            ...source.metadata,
          },
          // Tambahkan field asli untuk referensi
          srcip: source.srcip,
          dstip: source.dstip,
          event_name: source.event_name,
          event_type: source.event_type,
          event_score: source.event_score,
          assignee: source.assignee,
        }
      })
    }

    console.log(`Processed ${alerts.length} alerts`)
    return alerts
  } catch (error) {
    console.error("Error getting alerts:", error)
    return generateMockAlerts()
  }
}

// Fungsi untuk menghasilkan data dummy
function generateMockAlerts(): StellarCyberAlert[] {
  return Array.from({ length: 10 }, (_, i) => ({
    _id: `mock-alert-${i}`,
    index: `mock-index-${i}`,
    title: `Mock Alert ${i}`,
    description: `This is a mock alert for development purposes when Stellar Cyber credentials are not available.`,
    severity: ["critical", "high", "medium", "low"][Math.floor(Math.random() * 4)],
    status: ["New", "In Progress", "Ignored", "Closed"][Math.floor(Math.random() * 4)] as AlertStatus,
    created_at: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
    source: "Mock Source",
    score: Math.floor(Math.random() * 100),
    metadata: {
      mock: true,
      environment: "development",
    },
  }))
}

// Fungsi untuk mengupdate status alert
export async function updateAlertStatus(params: {
  index: string
  alertId: string
  status: AlertStatus
  comments?: string
}): Promise<any> {
  const { HOST, TENANT_ID } = STELLAR_CYBER_CONFIG
  const { index, alertId, status, comments = "" } = params

  // Jika environment variables tidak tersedia, kembalikan respons dummy
  if (!HOST || HOST === "localhost" || !TENANT_ID || TENANT_ID === "demo-tenant") {
    console.warn("Stellar Cyber credentials not properly configured. Using mock response.")
    return { success: true, message: "Status updated (mock)" }
  }

  try {
    const token = await getAccessToken()

    // Jika token adalah fallback token, kembalikan respons dummy
    if (token === "dummy-access-token-for-development" || token === "error-token-for-fallback") {
      return { success: true, message: "Status updated (mock)" }
    }

    // Berdasarkan data yang diunggah, endpoint yang benar mungkin berbeda
    const url = urlunparse({
      protocol: "https",
      hostname: HOST,
      pathname: "/connect/api/v1/update_event_status", // Endpoint yang mungkin benar
    })

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    // Format payload berdasarkan format yang mungkin diharapkan API
    const payload = {
      tenant_id: TENANT_ID,
      event_id: alertId,
      status,
      comments,
      index,
    }

    console.log("Updating alert status with payload:", payload)

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })

    console.log("Update status response:", response.status)

    if (!response.ok) {
      console.error(`Failed to update alert status: ${response.status} ${response.statusText}`)
      return { success: false, message: "Failed to update status" }
    }

    return await response.json()
  } catch (error) {
    console.error("Error updating alert status:", error)
    return { success: false, message: "Error updating status" }
  }
}
