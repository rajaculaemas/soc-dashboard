import { STELLAR_CYBER_CONFIG, type AlertStatus, type StellarCyberAlert } from "@/lib/config/stellar-cyber"
import { urlunparse } from "@/lib/utils/url"

// Fungsi untuk mendapatkan access token
export async function getAccessToken(): Promise<string> {
  const { HOST, USER_ID, REFRESH_TOKEN } = STELLAR_CYBER_CONFIG

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
    const response = await fetch(url, {
      method: "POST",
      headers,
    })

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
  const { minScore = 0, status, sort = "created_at", order = "desc", limit = 100, page = 1 } = params

  // Jika environment variables tidak tersedia, kembalikan data dummy
  if (!HOST || HOST === "localhost" || !TENANT_ID || TENANT_ID === "demo-tenant") {
    console.warn("Stellar Cyber credentials not properly configured. Using mock data.")
    return generateMockAlerts()
  }

  try {
    const token = await getAccessToken()

    // Jika token adalah fallback token, kembalikan data dummy
    if (token === "dummy-access-token-for-development" || token === "error-token-for-fallback") {
      return generateMockAlerts()
    }

    const queryParams = new URLSearchParams()
    queryParams.append("tenant_id", TENANT_ID)
    queryParams.append("min_score", minScore.toString())
    if (status) queryParams.append("status", status)
    queryParams.append("sort", sort)
    queryParams.append("order", order)
    queryParams.append("limit", limit.toString())
    queryParams.append("page", page.toString())

    const url = urlunparse({
      protocol: "https",
      hostname: HOST,
      pathname: "/connect/api/v1/cases",
      search: queryParams.toString(),
    })

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    })

    if (!response.ok) {
      console.error(`Failed to get alerts: ${response.status} ${response.statusText}`)
      return generateMockAlerts()
    }

    const data = await response.json()
    return data
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
  const { HOST } = STELLAR_CYBER_CONFIG
  const { index, alertId, status, comments = "" } = params

  // Jika environment variables tidak tersedia, kembalikan respons dummy
  if (!HOST || HOST === "localhost") {
    console.warn("Stellar Cyber credentials not properly configured. Using mock response.")
    return { success: true, message: "Status updated (mock)" }
  }

  try {
    const token = await getAccessToken()

    // Jika token adalah fallback token, kembalikan respons dummy
    if (token === "dummy-access-token-for-development" || token === "error-token-for-fallback") {
      return { success: true, message: "Status updated (mock)" }
    }

    const url = urlunparse({
      protocol: "https",
      hostname: HOST,
      pathname: "/connect/api/update_ser",
    })

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    const payload = {
      index,
      _id: alertId,
      status,
      comments,
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })

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
