"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { CalendarIcon, AlertTriangleIcon, NetworkIcon, ShieldIcon, InfoIcon, FileIcon, GlobeIcon } from "lucide-react"

interface AlertDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  alert: Alert | null
}

interface Alert {
  _id: string
  alert_name: string
  xdr_event?: {
    display_name?: string
  }
  severity: string | number
  alert_time: number
  status: string
  source_ip?: string
  dest_ip?: string
  description: string
  metadata: any
  // Additional fields that might be present
  alert_type?: string
  category?: string
  subcategory?: string
  confidence?: number
  risk_score?: number
  source_port?: number
  dest_port?: number
  protocol?: string
  user?: string
  host?: string
  process?: string
  file_path?: string
  hash?: string
  url?: string
  domain?: string
  mitre_tactics?: string[]
  mitre_techniques?: string[]
  srcip?: string
  dstip?: string
  srcport?: number
  dstport?: number
  xdr_desc?: string
}

export function AlertDetailDialog({ open, onOpenChange, alert }: AlertDetailDialogProps) {
  const getSeverityColor = (severity: unknown) => {
    const severityStr = String(severity).toLowerCase()

    // Handle numeric severity (Stellar Cyber uses 0-100 scale)
    const numericSeverity = Number(severity)
    if (!isNaN(numericSeverity)) {
      if (numericSeverity >= 80) return "destructive" // Critical/High
      if (numericSeverity >= 60) return "destructive" // High
      if (numericSeverity >= 40) return "default" // Medium
      if (numericSeverity >= 20) return "secondary" // Low
      return "outline" // Very Low
    }

    // Handle string severity
    switch (severityStr) {
      case "critical":
        return "destructive"
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open":
      case "new":
        return "destructive"
      case "in progress":
        return "default"
      case "resolved":
        return "secondary"
      case "closed":
        return "outline"
      default:
        return "outline"
    }
  }

  const formatAlertTime = (timestamp: number | string) => {
    try {
      let date: Date

      if (typeof timestamp === "string") {
        // Try parsing as ISO string first
        date = new Date(timestamp)
        if (isNaN(date.getTime())) {
          // If that fails, try parsing as number
          const numTimestamp = Number(timestamp)
          if (!isNaN(numTimestamp)) {
            date = new Date(numTimestamp > 1000000000000 ? numTimestamp : numTimestamp * 1000)
          } else {
            return "Invalid Date"
          }
        }
      } else {
        // Handle numeric timestamp
        date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000)
      }

      if (isNaN(date.getTime())) {
        return "Invalid Date"
      }

      return date.toLocaleString()
    } catch (error) {
      console.error("Error formatting alert time:", error, "timestamp:", timestamp)
      return "Invalid Date"
    }
  }

  const formatMetadata = (metadata: any) => {
    if (!metadata || typeof metadata !== "object") return {}

    // Filter out null, undefined, and empty values
    const filtered = Object.entries(metadata).filter(
      ([key, value]) => value !== null && value !== undefined && value !== "" && value !== 0,
    )

    return Object.fromEntries(filtered)
  }

  const getSeverityLabel = (severity: unknown) => {
    const numericSeverity = Number(severity)
    if (!isNaN(numericSeverity)) {
      if (numericSeverity >= 80) return `Critical (${severity})`
      if (numericSeverity >= 60) return `High (${severity})`
      if (numericSeverity >= 40) return `Medium (${severity})`
      if (numericSeverity >= 20) return `Low (${severity})`
      return `Very Low (${severity})`
    }
    return String(severity)
  }

  // Extract alert name from various sources
  const getAlertName = (alert: Alert) => {
    return (
      alert.alert_name ||
      alert.xdr_event?.display_name ||
      alert.metadata?.alert_name ||
      alert.metadata?.xdr_event?.display_name ||
      alert.metadata?.event_name ||
      "Unknown Alert"
    )
  }

  // Extract alert ID from various sources
  const getAlertId = (alert: Alert) => {
    return alert._id || alert.metadata?.alert_id || alert.metadata?._id || "N/A"
  }

  if (!open || !alert) return null

  const formattedMetadata = formatMetadata(alert.metadata)
  const alertName = getAlertName(alert)
  const alertId = getAlertId(alert)

  // Extract technical details from metadata
  const technicalInfo = {
    // Network details
    srcip: alert.metadata?.srcip || alert.source_ip || alert.srcip,
    dstip: alert.metadata?.dstip || alert.dest_ip || alert.dstip,
    srcport: alert.metadata?.srcport || alert.source_port || alert.srcport,
    dstport: alert.metadata?.dstport || alert.dest_port || alert.dstport,
    protocol: alert.metadata?.protocol || alert.protocol,
    srcmac: alert.metadata?.srcmac,

    // Application details
    appid_name: alert.metadata?.appid_name,
    appid_family: alert.metadata?.appid_family,
    appid_stdport: alert.metadata?.appid_stdport,

    // Reputation and scoring
    srcip_reputation: alert.metadata?.srcip_reputation,
    dstip_reputation: alert.metadata?.dstip_reputation,
    event_score: alert.metadata?.event_score || alert.metadata?.score,

    // Event details
    event_type: alert.metadata?.event_type || alert.alert_type,
    event_name: alert.metadata?.event_name,
    repeat_count: alert.metadata?.repeat_count,

    // User and host info
    srcip_username: alert.metadata?.srcip_username,
    tenant_name: alert.metadata?.tenant_name,

    // Timestamps
    alert_time: alert.metadata?.alert_time,
    timestamp: alert.metadata?.timestamp,
    closed_time: alert.metadata?.closed_time,

    // Assignment
    assignee: alert.metadata?.assignee,

    // Comments
    comment: alert.metadata?.comment,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5" />
            Alert Details
          </DialogTitle>
          <DialogDescription>{alertName}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="technical">Technical Details</TabsTrigger>
            <TabsTrigger value="metadata">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <InfoIcon className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Alert Name</label>
                        <p className="text-sm font-medium">{alertName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Alert ID</label>
                        <p className="text-sm font-mono">{alertId}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Severity</label>
                        <Badge variant={getSeverityColor(alert.severity)}>{getSeverityLabel(alert.severity)}</Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <Badge variant={getStatusColor(alert.status)}>{alert.status || "Unknown"}</Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Alert Time</label>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm">
                            {formatAlertTime(
                              alert.metadata?.alert_time || alert.metadata?.timestamp || alert.alert_time,
                            )}
                          </p>
                        </div>
                      </div>
                      {technicalInfo.event_type && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Event Type</label>
                          <p className="text-sm">{technicalInfo.event_type}</p>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <p className="text-sm mt-1">
                        {alert.metadata?.xdr_desc || alert.description || "No description available"}
                      </p>
                    </div>

                    {technicalInfo.assignee && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Assigned To</label>
                        <p className="text-sm">{technicalInfo.assignee}</p>
                      </div>
                    )}

                    {technicalInfo.tenant_name && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tenant</label>
                        <p className="text-sm">{technicalInfo.tenant_name}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Network Information */}
                {(technicalInfo.srcip || technicalInfo.dstip) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <NetworkIcon className="h-5 w-5" />
                        Network Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        {technicalInfo.srcip && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Source IP</label>
                            <p className="text-sm font-mono">{technicalInfo.srcip}</p>
                            {technicalInfo.srcip_reputation && (
                              <p className="text-xs text-muted-foreground">
                                Reputation: {technicalInfo.srcip_reputation}
                              </p>
                            )}
                          </div>
                        )}
                        {technicalInfo.dstip && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Destination IP</label>
                            <p className="text-sm font-mono">{technicalInfo.dstip}</p>
                            {technicalInfo.dstip_reputation && (
                              <p className="text-xs text-muted-foreground">
                                Reputation: {technicalInfo.dstip_reputation}
                              </p>
                            )}
                          </div>
                        )}
                        {technicalInfo.srcport && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Source Port</label>
                            <p className="text-sm font-mono">{technicalInfo.srcport}</p>
                          </div>
                        )}
                        {technicalInfo.dstport && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Destination Port</label>
                            <p className="text-sm font-mono">{technicalInfo.dstport}</p>
                          </div>
                        )}
                        {technicalInfo.protocol && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Protocol</label>
                            <p className="text-sm">{technicalInfo.protocol}</p>
                          </div>
                        )}
                        {technicalInfo.srcmac && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Source MAC</label>
                            <p className="text-sm font-mono">{technicalInfo.srcmac}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="technical" className="space-y-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {/* Application Information */}
                {(technicalInfo.appid_name || technicalInfo.appid_family) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <GlobeIcon className="h-5 w-5" />
                        Application Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        {technicalInfo.appid_name && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Application</label>
                            <p className="text-sm">{technicalInfo.appid_name}</p>
                          </div>
                        )}
                        {technicalInfo.appid_family && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Application Family</label>
                            <p className="text-sm">{technicalInfo.appid_family}</p>
                          </div>
                        )}
                        {technicalInfo.appid_stdport && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Standard Port</label>
                            <p className="text-sm">{technicalInfo.appid_stdport}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Event Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShieldIcon className="h-5 w-5" />
                      Event Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      {technicalInfo.event_name && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Event Name</label>
                          <p className="text-sm">{technicalInfo.event_name}</p>
                        </div>
                      )}
                      {technicalInfo.event_score && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Event Score</label>
                          <p className="text-sm font-medium">{technicalInfo.event_score}</p>
                        </div>
                      )}
                      {technicalInfo.repeat_count && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Repeat Count</label>
                          <p className="text-sm">{technicalInfo.repeat_count}</p>
                        </div>
                      )}
                      {technicalInfo.srcip_username && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Source Username</label>
                          <p className="text-sm">{technicalInfo.srcip_username}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Timeline Information */}
                {(technicalInfo.alert_time || technicalInfo.closed_time) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5" />
                        Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        {technicalInfo.alert_time && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Alert Time</label>
                            <p className="text-sm">{formatAlertTime(technicalInfo.alert_time)}</p>
                          </div>
                        )}
                        {technicalInfo.timestamp && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Event Timestamp</label>
                            <p className="text-sm">{formatAlertTime(technicalInfo.timestamp)}</p>
                          </div>
                        )}
                        {technicalInfo.closed_time && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Closed Time</label>
                            <p className="text-sm">{formatAlertTime(technicalInfo.closed_time)}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Comments/Analysis */}
                {technicalInfo.comment && Array.isArray(technicalInfo.comment) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileIcon className="h-5 w-5" />
                        Analysis Comments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {technicalInfo.comment.map((comment: any, index: number) => (
                          <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">{comment.comment_user}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatAlertTime(comment.comment_time)}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Raw Metadata</CardTitle>
                <CardDescription>Complete alert data from the source system</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {Object.keys(formattedMetadata).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(formattedMetadata).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-3 gap-4 py-2 border-b border-border/50">
                          <div className="font-medium text-sm text-muted-foreground">{key}</div>
                          <div className="col-span-2 text-sm font-mono break-all">
                            {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <InfoIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No additional metadata available</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
