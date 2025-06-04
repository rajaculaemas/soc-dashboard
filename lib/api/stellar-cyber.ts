import fetch from "node-fetch"
import https from "https"
import type { AlertStatus, StellarCyberAlert } from "@/lib/config/stellar-cyber"
import { urlunparse } from "@/lib/utils/url"
import prisma from "@/lib/prisma"

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
})

// Fungsi untuk mendapatkan kredensial dari database
async function getStellarCyberCredentials(integrationId?: string) {
  try {
    // Jika integrationId disediakan, gunakan itu
    if (integrationId) {
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
      })

      if (!integration || integration.source !== "stellar-cyber") {
        throw new Error("Stellar Cyber integration not found")
      }

      let credentials: Record<string, any> = {}

      if (Array.isArray(integration.credentials)) {
        const credentialsArray = integration.credentials as any[]
        credentialsArray.forEach((cred) => {
          if (cred && typeof cred === "object" && "key" in cred && "value" in cred) {
            credentials[cred.key] = cred.value
          }
        })
      } else {
        credentials = integration.credentials as Record<string, any>
      }

      return {
        HOST: credentials.host || credentials.STELLAR_CYBER_HOST || "",
        USER_ID: credentials.user_id || credentials.STELLAR_CYBER_USER_ID || "",
        REFRESH_TOKEN: credentials.refresh_token || credentials.STELLAR_CYBER_REFRESH_TOKEN || "",
        TENANT_ID: credentials.tenant_id || credentials.STELLAR_CYBER_TENANT_ID || "",
      }
    }

    // Jika tidak ada integrationId, cari integrasi Stellar Cyber yang aktif
    const integration = await prisma.integration.findFirst({
      where: {
        source: "stellar-cyber",
        status: "connected",
      },
    })

    if (!integration) {
      // Fallback ke environment variables
      return {
        HOST: process.env.STELLAR_CYBER_HOST || "localhost",
        USER_ID: process.env.STELLAR_CYBER_USER_ID || "demo@example.com",
        REFRESH_TOKEN: process.env.STELLAR_CYBER_REFRESH_TOKEN || "demo-token",
        TENANT_ID: process.env.STELLAR_CYBER_TENANT_ID || "demo-tenant",
      }
    }

    let credentials: Record<string, any> = {}

    if (Array.isArray(integration.credentials)) {
      const credentialsArray = integration.credentials as any[]
      credentialsArray.forEach((cred) => {
        if (cred && typeof cred === "object" && "key" in cred && "value" in cred) {
          credentials[cred.key] = cred.value
        }
      })
    } else {
      credentials = integration.credentials as Record<string, any>
    }

    return {
      HOST: credentials.host || credentials.STELLAR_CYBER_HOST || "",
      USER_ID: credentials.user_id || credentials.STELLAR_CYBER_USER_ID || "",
      REFRESH_TOKEN: credentials.refresh_token || credentials.STELLAR_CYBER_REFRESH_TOKEN || "",
      TENANT_ID: credentials.tenant_id || credentials.STELLAR_CYBER_TENANT_ID || "",
    }
  } catch (error) {
    console.error("Error getting Stellar Cyber credentials:", error)
    // Fallback ke environment variables
    return {
      HOST: process.env.STELLAR_CYBER_HOST || "localhost",
      USER_ID: process.env.STELLAR_CYBER_USER_ID || "demo@example.com",
      REFRESH_TOKEN: process.env.STELLAR_CYBER_REFRESH_TOKEN || "demo-token",
      TENANT_ID: process.env.STELLAR_CYBER_TENANT_ID || "demo-tenant",
    }
  }
}

// Fungsi untuk mendapatkan access token
export async function getAccessToken(integrationId?: string): Promise<string> {
  const { HOST, USER_ID, REFRESH_TOKEN } = await getStellarCyberCredentials(integrationId)

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
  integrationId?: string
}): Promise<StellarCyberAlert[]> {
  const { minScore = 0, status, sort = "timestamp", order = "desc", limit = 100, page = 1, integrationId } = params
  const { HOST, TENANT_ID } = await getStellarCyberCredentials(integrationId)

  if (!HOST || !TENANT_ID) {
    console.warn("Stellar Cyber credentials not properly configured. Using mock data.")
    return generateMockAlerts()
  }

  try {
    const token = await getAccessToken(integrationId)
    if (!token || token === "dummy-access-token-for-development" || token === "error-token-for-fallback") {
      console.warn("Fallback token used. Returning mock data.")
      return generateMockAlerts()
    }

    // Build query parameters
    const queryParams: Record<string, string> = {
      size: limit.toString(),
    }

    // Add filters
    const mustClauses = [`tenantid:${TENANT_ID}`]

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

    queryParams.q = mustClauses.join(" AND ")

    if (sort) {
      queryParams.sort = `${sort}:${order}`
    }

    const url = urlunparse({
      protocol: "https",
      hostname: HOST,
      pathname: "/connect/api/data/aella-ser-*/_search",
      search: new URLSearchParams(queryParams).toString(),
    })

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    console.log("Final request URL:", url)

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

    // Process response data dengan field tambahan dari JSON yang diberikan
    const alerts: StellarCyberAlert[] = data.hits.hits.map((hit: any) => {
      const source = hit._source || {}
      const stellar = source.stellar || {}
      const user_action = source.user_action || {}
      const xdr_event = source.xdr_event || {}

      // Helper function to handle timestamp conversion
      const convertTimestamp = (ts: any): string => {
        if (!ts) return ""
        if (typeof ts === "string" && ts.includes("T")) return ts

        const timestamp = typeof ts === "number" ? ts : Number.parseInt(ts)
        return new Date(timestamp).toISOString()
      }

      return {
        _id: hit._id || stellar.uuid || "",
        index: hit._index || "",
        title: source.xdr_event?.display_name || source.event_name || "Unknown Alert",
        description: xdr_event.description || source.xdr_event?.description || "",
        severity: source.severity || "medium",
        status: source.event_status || stellar.status || "New",
        created_at: convertTimestamp(source.timestamp),
        updated_at: convertTimestamp(source.write_time),
        source: source.msg_origin?.source || "Stellar Cyber",
        score: source.event_score || source.score || 0,
        metadata: {
          // Basic alert info
          alert_id: hit._id,
          alert_time: convertTimestamp(stellar.alert_time),
          severity: source.severity,
          event_status: source.event_status,
          alert_type: source.event_type,
          closed_time: convertTimestamp(user_action.last_timestamp),
          assignee: source.assignee,
          comment: source.comments,
          tenant_name: source.tenant_name,
          timestamp: convertTimestamp(source.timestamp),

          // Application info
          appid_family: source.appid_family,
          appid_name: source.appid_name,
          appid_stdport: source.appid_stdport,
          repeat_count: source.repeat_count || 1,

          // Network info
          dstip: source.dstip,
          dstip_reputation: source.dstip_reputation,
          dstport: source.dstport,
          srcip: source.srcip,
          srcip_reputation: source.srcip_reputation,
          srcip_username: source.srcip_username,
          srcmac: source.srcmac,
          srcport: source.srcport,

          // XDR description
          xdr_desc: xdr_event.description,

          // Additional metadata
          event_type: source.event_type,
          event_name: source.event_name,
          event_score: source.event_score,
          ...source.metadata,
        },
      }
    })

    console.log(`✅ Total alerts fetched: ${alerts.length}`)
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
  integrationId?: string
}): Promise<any> {
  const { index, alertId, status, comments = "", integrationId } = params
  const { HOST, TENANT_ID } = await getStellarCyberCredentials(integrationId)

  if (!HOST || HOST === "localhost" || !TENANT_ID || TENANT_ID === "demo-tenant") {
    console.warn("Stellar Cyber credentials not properly configured. Using mock response.")
    return { success: true, message: "Status updated (mock)" }
  }

  try {
    const token = await getAccessToken(integrationId)

    if (token === "dummy-access-token-for-development" || token === "error-token-for-fallback") {
      return { success: true, message: "Status updated (mock)" }
    }

    const url = urlunparse({
      protocol: "https",
      hostname: HOST,
      pathname: "/connect/api/v1/update_event_status",
    })

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

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
