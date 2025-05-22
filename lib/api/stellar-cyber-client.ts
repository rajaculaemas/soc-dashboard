import fetch from "node-fetch"
import https from "https"
import { urlunparse } from "@/lib/utils/url"
import type { AlertStatus, StellarCyberAlert } from "@/lib/config/stellar-cyber"

// Abaikan validasi sertifikat SSL
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
})

// Fungsi untuk mendapatkan access token
export async function getAccessToken(credentials: any): Promise<string> {
  // Ekstrak kredensial dari parameter, bukan dari config
  const host = credentials.host || credentials.STELLAR_CYBER_HOST
  const user_id = credentials.user_id || credentials.STELLAR_CYBER_USER_ID
  const refresh_token = credentials.refresh_token || credentials.STELLAR_CYBER_REFRESH_TOKEN

  console.log("Checking credentials:", {
    host: host ? "configured" : "missing",
    user_id: user_id ? "configured" : "missing",
    refresh_token: refresh_token ? "configured" : "missing",
  })

  // Jika kredensial tidak lengkap, kembalikan token dummy
  if (!host || !user_id || !refresh_token) {
    console.warn("Stellar Cyber credentials not properly configured. Using dummy token for development.")
    return "dummy-access-token-for-development"
  }

  const auth = Buffer.from(`${user_id}:${refresh_token}`).toString("base64")

  const headers = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/x-www-form-urlencoded",
  }

  const url = urlunparse({
    protocol: "https",
    hostname: host,
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

// Fungsi untuk menguji koneksi Stellar Cyber
export async function testStellarCyberConnection(credentials: any): Promise<{ success: boolean; message: string }> {
  try {
    const token = await getAccessToken(credentials)

    if (!token || token === "dummy-access-token-for-development" || token === "error-token-for-fallback") {
      return {
        success: false,
        message: "Failed to authenticate with Stellar Cyber. Please check your credentials.",
      }
    }

    // Jika berhasil mendapatkan token, coba ambil data sederhana untuk memastikan koneksi berfungsi
    const host = credentials.host || credentials.STELLAR_CYBER_HOST
    const tenant_id = credentials.tenant_id || credentials.STELLAR_CYBER_TENANT_ID

    const url = urlunparse({
      protocol: "https",
      hostname: host,
      pathname: "/connect/api/data/aella-ser-*/_search",
      search: new URLSearchParams({
        q: `tenantid:${tenant_id}`,
        size: "1",
      }).toString(),
    })

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      agent: httpsAgent,
    })

    if (!response.ok) {
      return {
        success: false,
        message: `Failed to connect to Stellar Cyber API: ${response.status} ${response.statusText}`,
      }
    }

    return {
      success: true,
      message: "Successfully connected to Stellar Cyber",
    }
  } catch (error) {
    console.error("Error testing Stellar Cyber connection:", error)
    return {
      success: false,
      message: `Error testing connection: ${(error as Error).message}`,
    }
  }
}

// Fungsi untuk mengambil alert dari Stellar Cyber
export async function fetchAlertsFromStellarCyber(credentials: any, params: any = {}): Promise<StellarCyberAlert[]> {
  // Ekstrak kredensial dari parameter, bukan dari config
  const host = credentials.host || credentials.STELLAR_CYBER_HOST
  const tenant_id = credentials.tenant_id || credentials.STELLAR_CYBER_TENANT_ID

  const { minScore = 0, status, sort = "timestamp", order = "desc", limit = 100, page = 1 } = params

  if (!host || !tenant_id) {
    console.warn("Stellar Cyber credentials not properly configured.")
    return []
  }

  try {
    const token = await getAccessToken(credentials)
    if (!token || token === "dummy-access-token-for-development" || token === "error-token-for-fallback") {
      console.warn("Failed to get access token.")
      return []
    }

    // Build query parameters
    const queryParams: Record<string, string> = {
      size: limit.toString(),
    }

    // Add filters
    const mustClauses = [`tenantid:${tenant_id}`]

    if (status) {
      mustClauses.push(`event_status:${status}`)
    }

    if (minScore > 0) {
      mustClauses.push(`score:>=${minScore}`)
    }

    // Date range filter (today in UTC+7)
    const now = new Date()
    const tzOffset = 7 * 60 * 60 * 1000 // UTC+7
    const localTime = new Date(now.getTime() + tzOffset)
    const startOfDay = new Date(localTime)
    startOfDay.setHours(0, 0, 0, 0)

    mustClauses.push(`timestamp:[${startOfDay.toISOString()} TO ${localTime.toISOString()}]`)

    // Combine all must clauses
    queryParams.q = mustClauses.join(" AND ")

    // Add sorting
    if (sort) {
      queryParams.sort = `${sort}:${order}`
    }

    // Construct final URL
    const url = urlunparse({
      protocol: "https",
      hostname: host,
      pathname: "/connect/api/data/aella-ser-*/_search",
      search: new URLSearchParams(queryParams).toString(),
    })

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    console.log("Final request URL:", url)

    // Make GET request
    const response = await fetch(url, {
      method: "GET",
      headers,
      agent: httpsAgent,
    })

    console.log("Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to get alerts: ${response.status} ${response.statusText}`, errorText)
      return []
    }

    const data = await response.json()

    if (!data.hits || !data.hits.hits) {
      console.warn("No hits in response.")
      return []
    }

    // Process response data
    const alerts: StellarCyberAlert[] = data.hits.hits.map((hit: any) => {
      const source = hit._source || {}
      const stellar = source.stellar || {}
      const user_action = source.user_action || {}
      const dstip_geo = source.dstip_geo || {}
      const srcip_geo = source.srcip_geo || {}

      // Helper function to handle timestamp conversion
      const convertTimestamp = (ts: any): string => {
        if (!ts) return ""
        if (typeof ts === "string" && ts.includes("T")) return ts

        // Use UTC for consistency
        const timestamp = typeof ts === "number" ? ts : Number.parseInt(ts)
        return new Date(timestamp).toISOString()
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
        // Additional fields
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
        // Existing fields
        srcip: source.srcip,
        dstip: source.dstip,
        event_name: source.event_name,
        event_type: source.event_type,
        event_score: source.event_score,
        assignee: source.assignee,
        stellar_uuid: stellar.uuid,
      }
    })

    console.log(`Total alerts fetched: ${alerts.length}`)
    return alerts
  } catch (error) {
    console.error("Error getting alerts:", error)
    return []
  }
}

// Fungsi untuk mengupdate status alert di Stellar Cyber
export async function updateAlertStatusInStellarCyber(params: {
  credentials: any
  alertId: string
  index: string
  status: AlertStatus
  comments?: string
}): Promise<any> {
  const { credentials, alertId, index, status, comments = "" } = params

  // Ekstrak kredensial dari parameter, bukan dari config
  const host = credentials.host || credentials.STELLAR_CYBER_HOST
  const tenant_id = credentials.tenant_id || credentials.STELLAR_CYBER_TENANT_ID

  // Jika kredensial tidak lengkap, kembalikan respons dummy
  if (!host || !tenant_id) {
    console.warn("Stellar Cyber credentials not properly configured.")
    return { success: false, message: "Missing credentials" }
  }

  try {
    const token = await getAccessToken(credentials)

    // Jika token adalah fallback token, kembalikan respons dummy
    if (token === "dummy-access-token-for-development" || token === "error-token-for-fallback") {
      return { success: false, message: "Failed to authenticate" }
    }

    // Endpoint untuk update status
    const url = urlunparse({
      protocol: "https",
      hostname: host,
      pathname: "/connect/api/v1/update_event_status",
    })

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    // Format payload
    const payload = {
      tenant_id,
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
