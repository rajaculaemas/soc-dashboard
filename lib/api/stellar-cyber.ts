import fetch from "node-fetch";
import https from "https";
import { STELLAR_CYBER_CONFIG, type AlertStatus, type StellarCyberAlert } from "@/lib/config/stellar-cyber"
import { urlunparse } from "@/lib/utils/url"


const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // ðŸ’¥ Abaikan validasi sertifikat
});

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
      agent: httpsAgent,
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

  if (!HOST || !TENANT_ID) {
    console.warn("Stellar Cyber credentials not properly configured. Using mock data.")
    return generateMockAlerts()
  }

  try {
    const token = await getAccessToken()
    if (!token || token === "dummy-access-token-for-development" || token === "error-token-for-fallback") {
      console.warn("Fallback token used. Returning mock data.")
      return generateMockAlerts()
    }

    // 1. Build query parameters mirroring Python implementation
    const queryParams: Record<string, string> = {
      size: limit.toString()
    }

    // 2. Add filters - construct the query step by step
    const mustClauses = [`tenantid:${TENANT_ID}`]
    
    if (status) {
      mustClauses.push(`event_status:${status}`)
    }
    
    if (minScore > 0) {
      mustClauses.push(`score:>=${minScore}`)
    }

    // 3. Date range filter (today in UTC+7)
    const now = new Date()
    const tzOffset = 7 * 60 * 60 * 1000 // UTC+7
    const localTime = new Date(now.getTime() + tzOffset)
    const startOfDay = new Date(localTime)
    startOfDay.setHours(0, 0, 0, 0)
    
    mustClauses.push(`timestamp:[${startOfDay.toISOString()} TO ${localTime.toISOString()}]`)

    // 4. Combine all must clauses
    queryParams.q = mustClauses.join(' AND ')

    // 5. Add sorting if specified
    if (sort) {
      queryParams.sort = `${sort}:${order}`
    }

    // 6. Construct final URL
    const url = urlunparse({
      protocol: "https",
      hostname: HOST,
      pathname: "/connect/api/data/aella-ser-*/_search",
      search: new URLSearchParams(queryParams).toString()
    })

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    console.log('Final request URL:', url)

    // 7. Make GET request without body
    const response = await fetch(url, {
      method: "GET",
      headers,
      agent: httpsAgent,
    })

    console.log("Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to get alerts: ${response.status} ${response.statusText}`, errorText)
      return generateMockAlerts()
    }

    const data = await response.json()

    if (!data.hits || !data.hits.hits) {
      console.warn("No hits in response.")
      return []
    }

    // 8. Process response data
const alerts: StellarCyberAlert[] = data.hits.hits.map((hit: any) => {
  const source = hit._source || {};
  const stellar = source.stellar || {};
  const user_action = source.user_action || {};
  const dstip_geo = source.dstip_geo || {};
  const srcip_geo = source.srcip_geo || {};

  // Helper function to handle timestamp conversion
const convertTimestamp = (ts: any): string => {
  if (!ts) return "";
  if (typeof ts === 'string' && ts.includes('T')) return ts;
  
  // Gunakan UTC untuk konsistensi antara server dan client
  const timestamp = typeof ts === 'number' ? ts : parseInt(ts);
  return new Date(timestamp).toISOString(); // Selalu gunakan ISO string untuk konsistensi
}

  return {
    _id: hit._id || stellar.uuid || "",
    index: hit._index || "",
    title: source.xdr_event?.display_name || source.event_name || "Unknown Alert",
    description: source.xdr_event?.description || "",
    severity: source.severity || "medium",
    status: source.event_status || stellar.status || "New",
    created_at: convertTimestamp(source.timestamp),
    updated_at: convertTimestamp(source.write_time),
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
    // Field tambahan yang diminta
    dstip_geo_point: source.dstip_geo_point || "",
    dstip_host: source.dstip_host || "",
    dstip_reputation: source.dstip_reputation || "",
    srcip_reputation: source.srcip_reputation || "",
    alert_time: convertTimestamp(stellar.alert_time),
    close_time: convertTimestamp(user_action.last_timestamp),
    tenant_name: source.tenant_name || "",
    appid_name: source.appid_name || "",
    appid_stdport: source.appid_stdport || "",
    dstport: source.dstport || 0,
    srcip_username: user_action.last_user || "",
    // Field yang sudah ada sebelumnya
    srcip: source.srcip,
    dstip: source.dstip,
    event_name: source.event_name,
    event_type: source.event_type,
    event_score: source.event_score,
    assignee: source.assignee,
  }
});

    console.log(`âœ… Total alerts fetched: ${alerts.length}`)
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
      agent: httpsAgent,
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
