import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { integrationId } = await request.json()

    if (!integrationId) {
      return NextResponse.json({ success: false, error: "Integration ID is required" }, { status: 400 })
    }

    console.log("Starting alert sync for integration:", integrationId)

    // Get integration details from database
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    })

    if (!integration) {
      return NextResponse.json({ success: false, error: "Integration not found" }, { status: 404 })
    }

    console.log("Found integration:", integration.name)

    // Extract credentials from the integration
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

    console.log("Credentials keys:", Object.keys(credentials))

    const host = credentials.host || credentials.STELLAR_CYBER_HOST || ""
    const userId = credentials.user_id || credentials.STELLAR_CYBER_USER_ID || ""
    const refreshToken = credentials.refresh_token || credentials.STELLAR_CYBER_REFRESH_TOKEN || ""
    const tenantId = credentials.tenant_id || credentials.STELLAR_CYBER_TENANT_ID || ""

    console.log("Extracted credentials:", {
      host: host ? "present" : "missing",
      userId: userId ? "present" : "missing",
      refreshToken: refreshToken ? "present" : "missing",
      tenantId: tenantId ? "present" : "missing",
    })

    if (!host || !userId || !refreshToken || !tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing integration credentials. Please check integration configuration.",
          details: {
            host: !host ? "missing" : "ok",
            userId: !userId ? "missing" : "ok",
            refreshToken: !refreshToken ? "missing" : "ok",
            tenantId: !tenantId ? "missing" : "ok",
          },
        },
        { status: 400 },
      )
    }

    // Ensure host has protocol
    const baseUrl = host.startsWith("http") ? host : `https://${host}`

    // Create Basic auth header exactly like Python code
    const nonce = Date.now()
    const auth = Buffer.from(`${userId}:${refreshToken}:${nonce}`).toString("base64")

    console.log("Getting access token from:", `${baseUrl}/connect/api/v1/access_token`)

    // Get access token
    const tokenResponse = await fetch(`${baseUrl}/connect/api/v1/access_token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      // @ts-ignore
      agent: require("https").Agent({ rejectUnauthorized: false }),
    })

    console.log("Token response status:", tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Failed to get access token:", errorText)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to authenticate with Stellar Cyber",
          details: errorText,
        },
        { status: 401 },
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "No access token received from Stellar Cyber",
        },
        { status: 401 },
      )
    }

    console.log("Access token obtained successfully")

    // Calculate time range (last 7 days)
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Build query for alerts
    const query = `tenantid:${tenantId} AND timestamp:[${sevenDaysAgo.toISOString()} TO ${now.toISOString()}]`
    const alertsUrl = `${baseUrl}/connect/api/data/aella-ser-*/_search`
    const params = new URLSearchParams({
      size: "100",
      q: query,
      sort: "timestamp:desc",
    })

    const finalUrl = `${alertsUrl}?${params}`
    console.log("Fetching alerts from:", finalUrl)

    // Fetch alerts
    const alertsResponse = await fetch(finalUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      // @ts-ignore
      agent: require("https").Agent({ rejectUnauthorized: false }),
    })

    console.log("Alerts response status:", alertsResponse.status)

    if (!alertsResponse.ok) {
      const errorText = await alertsResponse.text()
      console.error("Failed to fetch alerts:", errorText)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch alerts from Stellar Cyber",
          details: errorText,
        },
        { status: 500 },
      )
    }

    const alertsData = await alertsResponse.json()
    const alerts = alertsData.hits?.hits || []

    console.log("? Total alerts fetched from Stellar Cyber:", alerts.length)

    if (alerts.length === 0) {
      console.log("No alerts found in time range:", sevenDaysAgo.toISOString(), "to", now.toISOString())
      return NextResponse.json({
        success: true,
        message: "No alerts found in the specified time range",
        synced: 0,
        errors: 0,
      })
    }

    let syncedCount = 0
    let errorCount = 0

    // Process each alert
    for (const alertHit of alerts) {
      try {
        const alertData = alertHit._source
        const alertId = alertHit._id

        console.log(`Processing alert: ${alertId} - ${alertData.alert_name || "Unknown"}`)

        // Map Stellar Cyber alert to our schema
        const mappedAlert = {
          externalId: alertId,
          title: alertData.alert_name || alertData.xdr_event?.display_name || "Unknown Alert",
          description: alertData.xdr_desc || alertData.description || "",
          severity: String(alertData.severity || 0),
          status: alertData.event_status || "New",
          timestamp: new Date(alertData.timestamp || alertData.alert_time || new Date()),
          integrationId: integrationId,
          metadata: {
            // Store complete alert data in metadata for detailed view
            alert_id: alertId,
            alert_name: alertData.alert_name,
            alert_time: alertData.alert_time,
            severity: alertData.severity,
            event_status: alertData.event_status,
            alert_type: alertData.alert_type,
            closed_time: alertData.closed_time,
            assignee: alertData.assignee,
            comment: alertData.comment,
            tenant_name: alertData.tenant_name,
            timestamp: alertData.timestamp,

            // Network information
            srcip: alertData.srcip,
            dstip: alertData.dstip,
            srcport: alertData.srcport,
            dstport: alertData.dstport,
            protocol: alertData.protocol,
            srcmac: alertData.srcmac,

            // Application details
            appid_family: alertData.appid_family,
            appid_name: alertData.appid_name,
            appid_stdport: alertData.appid_stdport,

            // Reputation
            srcip_reputation: alertData.srcip_reputation,
            dstip_reputation: alertData.dstip_reputation,
            srcip_username: alertData.srcip_username,

            // Event details
            repeat_count: alertData.repeat_count,
            xdr_desc: alertData.xdr_desc,
            event_type: alertData.event_type,
            event_name: alertData.event_name,
            event_score: alertData.event_score,
            source: alertData.source,
            score: alertData.score,
            index: alertData.index,
          },
        }

        // Upsert alert in database
        await prisma.alert.upsert({
          where: {
            externalId: alertId,
          },
          update: {
            title: mappedAlert.title,
            description: mappedAlert.description,
            severity: mappedAlert.severity,
            status: mappedAlert.status,
            timestamp: mappedAlert.timestamp,
            metadata: mappedAlert.metadata,
          },
          create: mappedAlert,
        })

        syncedCount++
        console.log(`? Synced alert: ${alertId}`)
      } catch (error) {
        console.error(`? Error syncing alert ${alertHit._id}:`, error)
        errorCount++
      }
    }

    // Update integration last sync time
    await prisma.integration.update({
      where: { id: integrationId },
      data: { lastSync: new Date() },
    })

    console.log(`?? Alert sync completed: ${syncedCount} synced, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncedCount} alerts`,
      synced: syncedCount,
      errors: errorCount,
      total: alerts.length,
    })
  } catch (error) {
    console.error("? Error in alert sync:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during alert sync",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
