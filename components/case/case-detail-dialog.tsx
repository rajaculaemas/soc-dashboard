"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  CalendarIcon,
  UserIcon,
  AlertTriangleIcon,
  ClockIcon,
  TagIcon,
  RefreshCwIcon,
  EyeIcon,
  MessageSquareIcon,
} from "lucide-react"
import { SafeDate } from "@/components/ui/safe-date"
import { AlertDetailDialog } from "@/components/alert/alert-detail-dialog"

interface CaseDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  case: any
}

interface CaseDetail {
  id: string
  externalId: string
  ticketId: number
  name: string
  description: string
  status: string
  severity: string
  assignee?: string
  assigneeName?: string
  createdAt: Date
  modifiedAt: Date
  acknowledgedAt?: Date
  closedAt?: Date
  startTimestamp?: Date
  endTimestamp?: Date
  score: number
  size: number
  tags: string[]
  version: number
  createdBy?: string
  createdByName?: string
  modifiedBy?: string
  modifiedByName?: string
  custId?: string
  tenantName?: string
  metadata: any
  integration: {
    id: string
    name: string
  }
}

interface Alert {
  _id: string
  alert_name: string
  xdr_event?: {
    display_name?: string
  }
  severity: string
  alert_time: number
  status: string
  source_ip?: string
  dest_ip?: string
  description: string
  metadata: any
  id?: string
  externalId?: string
  title?: string
  timestamp?: string
  srcip?: string
  dstip?: string
  srcport?: number
  dstport?: number
  xdr_desc?: string
  alert_type?: string
}

interface CaseComment {
  id: string
  content: string
  author: string
  caseId: string
  createdAt: string
}

export function CaseDetailDialog({ open, onOpenChange, case: caseData }: CaseDetailDialogProps) {
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [comments, setComments] = useState<CaseComment[]>([])
  const [loading, setLoading] = useState(false)
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [alertDetailOpen, setAlertDetailOpen] = useState(false)

  useEffect(() => {
    if (open && caseData) {
      setCaseDetail(caseData)
      fetchCaseAlerts(caseData.id)
      fetchCaseComments(caseData.id)
    }
  }, [open, caseData])

  const fetchCaseAlerts = async (id: string) => {
    if (!id) return

    setAlertsLoading(true)
    try {
      console.log("Frontend: Fetching alerts for case:", id)
      const response = await fetch(`/api/cases/${id}/alerts`)
      const data = await response.json()

      console.log("Frontend: Alerts response:", data)

      if (data.success && data.data) {
        const alertsData = data.data.alerts || data.data || []
        console.log("Frontend: Extracted alerts data:", alertsData)

        if (Array.isArray(alertsData)) {
          const transformedAlerts = alertsData.map((alert: any) => {
            console.log("Transforming alert:", alert)

            const alertName =
              alert.metadata?.alert_name ||
              alert.title ||
              alert.metadata?.xdr_event?.display_name ||
              alert.metadata?.event_name ||
              "Unknown Alert"

            const alertId = alert.metadata?.alert_id || alert.externalId || alert.id || alert._id

            let alertTime = 0
            if (alert.metadata?.alert_time) {
              alertTime = new Date(alert.metadata.alert_time).getTime()
            } else if (alert.metadata?.timestamp) {
              alertTime = new Date(alert.metadata.timestamp).getTime()
            } else if (alert.timestamp) {
              alertTime = new Date(alert.timestamp).getTime()
            }

            const transformedAlert = {
              _id: alertId,
              alert_name: alertName,
              xdr_event: {
                display_name: alertName,
              },
              severity: String(alert.metadata?.severity || alert.severity || "Unknown"),
              alert_time: alertTime,
              status: alert.metadata?.event_status || alert.status || "Unknown",
              source_ip: alert.metadata?.srcip || alert.metadata?.source_ip,
              dest_ip: alert.metadata?.dstip || alert.metadata?.dest_ip,
              description: alert.metadata?.xdr_desc || alert.description || "",
              metadata: alert.metadata || {},
              id: alert.id,
              externalId: alert.externalId,
              title: alert.title,
              timestamp: alert.timestamp,
              srcip: alert.metadata?.srcip,
              dstip: alert.metadata?.dstip,
              srcport: alert.metadata?.srcport,
              dstport: alert.metadata?.dstport,
              xdr_desc: alert.metadata?.xdr_desc || alert.description,
              alert_type: alert.metadata?.alert_type || alert.metadata?.event_type,
            }

            console.log("Transformed alert:", transformedAlert)
            return transformedAlert
          })

          setAlerts(transformedAlerts)
          console.log("Frontend: Successfully set alerts:", transformedAlerts.length)
        } else {
          console.error("Frontend: Alerts data is not an array:", typeof alertsData)
          setAlerts([])
        }
      } else {
        console.error("Frontend: Failed to fetch alerts:", data.error || "Unknown error")
        setAlerts([])
      }
    } catch (error) {
      console.error("Frontend: Error fetching case alerts:", error)
      setAlerts([])
    } finally {
      setAlertsLoading(false)
    }
  }

  const fetchCaseComments = async (id: string) => {
    if (!id) return

    setCommentsLoading(true)
    try {
      console.log("Frontend: Fetching comments for case:", id)
      const response = await fetch(`/api/cases/${id}/comments`)
      const data = await response.json()

      console.log("Frontend: Comments response:", data)

      if (data.success && data.data) {
        setComments(data.data)
        console.log("Frontend: Successfully set comments:", data.data.length)
      } else {
        console.error("Frontend: Failed to fetch comments:", data.error || "Unknown error")
        setComments([])
      }
    } catch (error) {
      console.error("Frontend: Error fetching case comments:", error)
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }

  const handleViewAlertDetail = (alert: Alert) => {
    console.log("Opening alert detail for:", alert)
    setSelectedAlert(alert)
    setAlertDetailOpen(true)
  }

  const getSeverityColor = (severity: unknown) => {
    if (typeof severity !== "string") return "outline"

    switch (severity.toLowerCase()) {
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
      case "cancelled":
        return "outline"
      default:
        return "outline"
    }
  }

  const formatAlertTime = (timestamp: number) => {
    try {
      if (!timestamp || timestamp === 0) return "N/A"

      const date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000)

      if (isNaN(date.getTime())) return "N/A"

      return date.toLocaleString()
    } catch (error) {
      console.error("Error formatting alert time:", error)
      return "N/A"
    }
  }

  // Create timeline events from case data and comments
  const getTimelineEvents = () => {
    const events = []

    // Case created event
    if (caseDetail?.createdAt) {
      events.push({
        type: "created",
        timestamp: new Date(caseDetail.createdAt),
        title: "Case Created",
        description: `Created by ${caseDetail.createdByName || caseDetail.createdBy || "System"}`,
        icon: "create",
      })
    }

    // Case acknowledged event
    if (caseDetail?.acknowledgedAt) {
      events.push({
        type: "acknowledged",
        timestamp: new Date(caseDetail.acknowledgedAt),
        title: "Case Acknowledged",
        description: "Case was acknowledged",
        icon: "acknowledge",
      })
    }

    // Add comments as timeline events
    comments.forEach((comment) => {
      events.push({
        type: "comment",
        timestamp: new Date(comment.createdAt),
        title: "Case Updated",
        description: comment.content,
        author: comment.author,
        icon: "comment",
      })
    })

    // Case modified event (if different from created)
    if (caseDetail?.modifiedAt && caseDetail.modifiedAt !== caseDetail.createdAt) {
      events.push({
        type: "modified",
        timestamp: new Date(caseDetail.modifiedAt),
        title: "Last Modified",
        description: `Modified by ${caseDetail.modifiedByName || caseDetail.modifiedBy || "System"}`,
        icon: "modify",
      })
    }

    // Case closed event
    if (caseDetail?.closedAt) {
      events.push({
        type: "closed",
        timestamp: new Date(caseDetail.closedAt),
        title: "Case Closed",
        description: "Case was closed",
        icon: "close",
      })
    }

    // Sort events by timestamp
    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "created":
        return "w-2 h-2 bg-blue-500 rounded-full mt-2"
      case "acknowledged":
        return "w-2 h-2 bg-yellow-500 rounded-full mt-2"
      case "comment":
        return "w-2 h-2 bg-green-500 rounded-full mt-2"
      case "modified":
        return "w-2 h-2 bg-orange-500 rounded-full mt-2"
      case "closed":
        return "w-2 h-2 bg-gray-500 rounded-full mt-2"
      default:
        return "w-2 h-2 bg-gray-400 rounded-full mt-2"
    }
  }

  if (!open) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5" />
              Case Details
              {caseDetail && (
                <Badge variant="outline" className="ml-2">
                  #{caseDetail.ticketId}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {caseDetail ? `Viewing details for case: ${caseDetail.name}` : "Loading case details..."}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCwIcon className="h-8 w-8 animate-spin" />
            </div>
          ) : caseDetail ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="alerts">Related Alerts ({alerts.length})</TabsTrigger>
                <TabsTrigger value="timeline">Timeline ({comments.length + 2})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Basic Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Case Name</label>
                            <p className="text-sm font-medium">{caseDetail.name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Ticket ID</label>
                            <p className="text-sm font-medium">#{caseDetail.ticketId}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Status</label>
                            <Badge variant={getStatusColor(caseDetail.status)}>{caseDetail.status}</Badge>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Severity</label>
                            <Badge variant={getSeverityColor(caseDetail.severity)}>{caseDetail.severity}</Badge>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Score</label>
                            <p className="text-sm font-medium">{caseDetail.score}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Size</label>
                            <p className="text-sm font-medium">{caseDetail.size}</p>
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Description</label>
                          <p className="text-sm mt-1">{caseDetail.description || "No description available"}</p>
                        </div>

                        {caseDetail.tags && caseDetail.tags.length > 0 && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Tags</label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {caseDetail.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  <TagIcon className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Assignment</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Assignee</label>
                            <div className="flex items-center gap-2 mt-1">
                              <UserIcon className="h-4 w-4 text-muted-foreground" />
                              <p className="text-sm">
                                {caseDetail.assigneeName || caseDetail.assignee || "Unassigned"}
                              </p>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Integration</label>
                            <p className="text-sm font-medium">{caseDetail.integration.name}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Timeline</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Created</label>
                            <div className="flex items-center gap-2 mt-1">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              <SafeDate date={caseDetail.createdAt} />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Last Modified</label>
                            <div className="flex items-center gap-2 mt-1">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              <SafeDate date={caseDetail.modifiedAt} />
                            </div>
                          </div>
                          {caseDetail.acknowledgedAt && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Acknowledged</label>
                              <div className="flex items-center gap-2 mt-1">
                                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                                <SafeDate date={caseDetail.acknowledgedAt} />
                              </div>
                            </div>
                          )}
                          {caseDetail.closedAt && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Closed</label>
                              <div className="flex items-center gap-2 mt-1">
                                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                                <SafeDate date={caseDetail.closedAt} />
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Audit Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Created By</label>
                            <p className="text-sm">{caseDetail.createdByName || caseDetail.createdBy || "System"}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Modified By</label>
                            <p className="text-sm">{caseDetail.modifiedByName || caseDetail.modifiedBy || "System"}</p>
                          </div>
                          {caseDetail.tenantName && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Tenant</label>
                              <p className="text-sm">{caseDetail.tenantName}</p>
                            </div>
                          )}
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Version</label>
                            <p className="text-sm">{caseDetail.version}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="alerts" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Related Alerts
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchCaseAlerts(caseDetail.id)}
                        disabled={alertsLoading}
                      >
                        <RefreshCwIcon className={`h-4 w-4 mr-2 ${alertsLoading ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    </CardTitle>
                    <CardDescription>Alerts associated with this case</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {alertsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCwIcon className="h-8 w-8 animate-spin" />
                        <p className="ml-2 text-muted-foreground">Loading alerts...</p>
                      </div>
                    ) : alerts.length > 0 ? (
                      <ScrollArea className="h-[400px]">
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-sm text-green-800">Found {alerts.length} alert(s) for this case</p>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Alert Name</TableHead>
                              <TableHead>Severity</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Source IP</TableHead>
                              <TableHead>Dest IP</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {alerts.map((alert, index) => (
                              <TableRow key={alert._id || index}>
                                <TableCell className="font-medium">{alert.alert_name || "Unknown Alert"}</TableCell>
                                <TableCell>
                                  <Badge variant={getSeverityColor(alert.severity)}>
                                    {alert.severity || "Unknown"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{alert.status || "Unknown"}</Badge>
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {alert.source_ip || alert.srcip || "N/A"}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {alert.dest_ip || alert.dstip || "N/A"}
                                </TableCell>
                                <TableCell className="text-sm">{formatAlertTime(alert.alert_time)}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewAlertDetail(alert)}
                                    className="h-8 px-2"
                                  >
                                    <EyeIcon className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8">
                        <AlertTriangleIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No alerts found for this case</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Try refreshing or check if the case has associated alerts in Stellar Cyber
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquareIcon className="h-5 w-5" />
                        Case Timeline
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchCaseComments(caseDetail.id)}
                        disabled={commentsLoading}
                      >
                        <RefreshCwIcon className={`h-4 w-4 mr-2 ${commentsLoading ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    </CardTitle>
                    <CardDescription>Chronological history of case events and updates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {commentsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCwIcon className="h-8 w-8 animate-spin" />
                        <p className="ml-2 text-muted-foreground">Loading timeline...</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {getTimelineEvents().map((event, index) => (
                            <div key={index} className="flex items-start gap-3">
                              <div className={getEventIcon(event.type)}></div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">{event.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    <SafeDate date={event.timestamp} />
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                                {event.author && (
                                  <p className="text-xs text-muted-foreground mt-1">by {event.author}</p>
                                )}
                              </div>
                            </div>
                          ))}
                          {getTimelineEvents().length === 0 && (
                            <div className="text-center py-8">
                              <MessageSquareIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground">No timeline events found</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8">
              <AlertTriangleIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Case not found</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDetailDialog open={alertDetailOpen} onOpenChange={setAlertDetailOpen} alert={selectedAlert} />
    </>
  )
}
