"use client"

import * as clipboard from "clipboard-polyfill"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, Filter, RefreshCw, AlertCircle, Download, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useAlertStore } from "@/lib/stores/alert-store"
import { useIntegrationStore } from "@/lib/stores/integration-store"
import type { AlertStatus } from "@/lib/config/stellar-cyber"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SafeDate } from "@/components/ui/safe-date"
import { Switch } from "@/components/ui/switch"
import { SyncStatus } from "@/components/alert/sync-status"

export default function AlertPanel() {
  const {
    alerts,
    loading,
    error,
    activeTab,
    filters,
    autoRefresh,
    lastSync,
    fetchAlerts,
    updateAlertStatus,
    setActiveTab,
    setFilters,
    setAutoRefresh,
    syncAlerts,
    getFilteredAlerts,
    startAutoRefresh,
    stopAutoRefresh,
  } = useAlertStore()

  const { integrations, fetchIntegrations } = useIntegrationStore()
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  const [updateStatus, setUpdateStatus] = useState<AlertStatus>("In Progress")
  const [comments, setComments] = useState("")
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [copiedAlertId, setCopiedAlertId] = useState(false)
  const [copiedRawData, setCopiedRawData] = useState(false)

  // Set default integration saat komponen mount
  useEffect(() => {
    // Ensure integrations is an array before filtering
    if (Array.isArray(integrations) && integrations.length > 0) {
      const defaultIntegration = integrations.find(
        (i) => i.name.toLowerCase().includes("stellar") || i.source === "stellar-cyber",
      )
      if (defaultIntegration) {
        setSelectedIntegration(defaultIntegration.id)
      }
    }
  }, [integrations])

  useEffect(() => {
    setIsClient(true)
  }, [])

  const loadAlerts = async () => {
    try {
      setRefreshing(true)

      // Build query parameters with proper timezone handling
      const params = new URLSearchParams()

      // Set time range based on current filter
      const now = new Date()
      let fromDate: Date

      switch (filters.timeRange) {
        case "1h":
          fromDate = new Date(now.getTime() - 60 * 60 * 1000)
          break
        case "12h":
          fromDate = new Date(now.getTime() - 12 * 60 * 60 * 1000)
          break
        case "24h":
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case "7d":
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        default:
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Default to 24h
      }

      params.append("from", fromDate.toISOString())

      if (filters.status && filters.status !== "all") {
        params.append("status", filters.status)
      }

      if (filters.severity && filters.severity !== "all") {
        params.append("severity", filters.severity)
      }

      console.log("Loading alerts with params:", Object.fromEntries(params))

      const response = await fetch(`/api/alerts?${params.toString()}`)
      const data = await response.json()

      console.log("Alert API response:", data)

      if (data.success) {
        // Update the alert store directly since we're bypassing the store's fetchAlerts
        useAlertStore.setState({
          alerts: data.data || [],
          loading: false,
          error: null,
        })
      } else {
        console.error("Failed to fetch alerts:", data.error)
        useAlertStore.setState({
          alerts: [],
          loading: false,
          error: data.error,
        })
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error)
      useAlertStore.setState({
        alerts: [],
        loading: false,
        error: "Failed to fetch alerts",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const handleSyncAlerts = async () => {
    if (!selectedIntegration) return

    try {
      setSyncing(true)
      await syncAlerts(selectedIntegration)
      // After sync completes, refresh the alerts
      await loadAlerts()
    } catch (error) {
      console.error("Failed to sync alerts:", error)
    } finally {
      setSyncing(false)
    }
  }

  // Auto-sync effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const startAutoSync = () => {
      // First sync immediately
      handleSyncAlerts()
      // Then set up interval for every 3 minutes (180000 ms)
      intervalId = setInterval(handleSyncAlerts, 180000)
    }

    if (autoRefresh && selectedIntegration) {
      startAutoSync()
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [autoRefresh, selectedIntegration])

  useEffect(() => {
    loadAlerts()
    fetchIntegrations()

    return () => {
      stopAutoRefresh()
    }
  }, [])

  useEffect(() => {
    // Reload alerts when filters change
    loadAlerts()
  }, [filters])

  const handleUpdateStatus = async () => {
    if (!selectedAlert) return

    await updateAlertStatus({
      alertId: selectedAlert.id,
      status: updateStatus,
      comments,
    })

    setSelectedAlert(null)
    setComments("")
  }

  const copyToClipboard = async (text: string, type: "alertId" | "rawData") => {
    try {
      await clipboard.writeText(text)
      if (type === "alertId") {
        setCopiedAlertId(true)
        setTimeout(() => setCopiedAlertId(false), 2000)
      } else {
        setCopiedRawData(true)
        setTimeout(() => setCopiedRawData(false), 2000)
      }
    } catch (err) {
      console.error("Gagal menyalin:", err)
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand("copy")
        if (type === "alertId") {
          setCopiedAlertId(true)
          setTimeout(() => setCopiedAlertId(false), 2000)
        } else {
          setCopiedRawData(true)
          setTimeout(() => setCopiedRawData(false), 2000)
        }
      } catch (err) {
        console.error("Fallback copy gagal:", err)
        alert("Gagal menyalin teks. Silakan salin manual.")
      } finally {
        document.body.removeChild(textarea)
      }
    }
  }

  const normalizeSeverity = (value: string | number): string => {
    const map: Record<string | number, string> = {
      100: "critical",
      80: "critical",
      Critical: "critical",
      High: "high",
      Medium: "medium",
      Low: "low",
      critical: "critical",
      high: "high",
      medium: "medium",
      low: "low",
    }

    return map[value] || "medium"
  }

  // Ensure alerts is an array before processing
  const alertsArray = Array.isArray(alerts) ? alerts : []

  const severityCounts = alertsArray.reduce(
    (acc, alert) => {
      const severity = normalizeSeverity(alert.severity || "medium")
      acc[severity] = (acc[severity] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const chartData = Object.entries(severityCounts).map(([name, value]) => ({ name, value }))

  const severityColor = (severity: string | number = "medium") => {
    const sev = String(severity).toLowerCase()
    switch (sev) {
      case "critical":
        return "bg-red-500"
      case "high":
        return "bg-orange-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const statusColor = (status = "New") => {
    switch (status) {
      case "New":
        return "bg-red-500"
      case "In Progress":
        return "bg-yellow-500"
      case "Ignored":
        return "bg-gray-500"
      case "Closed":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  // Filter alerts based on active tab
  const filteredAlerts = alertsArray.filter((alert) => {
    if (activeTab === "all") return true
    return alert.status === activeTab
  })

  // Ensure integrations is an array before filtering
  const stellarIntegrations = Array.isArray(integrations)
    ? integrations.filter((i) => i.source === "stellar-cyber" && i.status === "connected")
    : []

  const truncateAlertId = (id = "") => {
    if (id.length <= 12) return id
    return id.slice(0, 10) + "..."
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Alert Panel</h1>
          <p className="text-muted-foreground">Monitor and respond to security alerts in real-time</p>
          {lastSync && (
            <p className="text-xs text-muted-foreground mt-1">
              Last sync: <SafeDate date={lastSync.toISOString()} />
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Auto-refresh toggle - now controls auto-sync */}
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={(checked) => {
                setAutoRefresh(checked)
              }}
            />
            <Label htmlFor="auto-refresh" className="text-sm">
              Auto-sync (3m)
            </Label>
          </div>

          <Button variant="outline" size="sm" onClick={loadAlerts} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {stellarIntegrations.length > 0 && (
            <div className="flex items-center gap-2">
              <Select
                value={selectedIntegration || ""}
                onValueChange={(id) => {
                  useAlertStore.getState().setSelectedIntegration(id)
                  setSelectedIntegration(id)
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue
                    placeholder={
                      selectedIntegration
                        ? stellarIntegrations.find((i) => i.id === selectedIntegration)?.name
                        : "Select integration"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {stellarIntegrations.map((integration) => (
                    <SelectItem key={integration.id} value={integration.id}>
                      {integration.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="log360" disabled>
                    Log360
                  </SelectItem>
                  <SelectItem value="qradar" disabled>
                    QRadar
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleSyncAlerts} disabled={syncing || !selectedIntegration}>
                <Download className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Alerts"}
              </Button>
            </div>
          )}

          {/* Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Filter Alerts</h4>
                  <p className="text-sm text-muted-foreground">Customize your alert view</p>
                </div>
                <div className="grid gap-2">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="timeRange">Time Range</Label>
                    <Select
                      value={filters.timeRange}
                      onValueChange={(value) => setFilters({ timeRange: value as any })}
                    >
                      <SelectTrigger className="col-span-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">Last 1 hour</SelectItem>
                        <SelectItem value="12h">Last 12 hours</SelectItem>
                        <SelectItem value="24h">Last 24 hours</SelectItem>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="status">Status</Label>
                    <Select value={filters.status} onValueChange={(value) => setFilters({ status: value as any })}>
                      <SelectTrigger className="col-span-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Ignored">Ignored</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="severity">Severity</Label>
                    <Select value={filters.severity} onValueChange={(value) => setFilters({ severity: value })}>
                      <SelectTrigger className="col-span-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severity</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-600 font-medium">Error saat mengambil data alert:</p>
                <p className="text-red-600">{error}</p>
                <p className="text-sm text-red-500 mt-2">
                  Pastikan integrasi Stellar Cyber sudah dikonfigurasi dengan benar dan kredensial valid. Coba refresh
                  halaman atau periksa log server untuk informasi lebih lanjut.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <SyncStatus />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Alert Overview</CardTitle>
            <CardDescription>Current security alerts by severity</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-[250px] w-full" />
              </div>
            ) : (
              <ChartContainer
                config={{
                  value: {
                    label: "Count",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-value)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Alert Statistics</CardTitle>
            <CardDescription>Summary of current alert status</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Alerts</span>
                  <Badge variant="outline" className="text-lg">
                    {alertsArray.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">New</span>
                  <Badge variant="outline" className="bg-red-500/10 text-red-500">
                    {alertsArray.filter((a) => a.status === "New").length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">In Progress</span>
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                    {alertsArray.filter((a) => a.status === "In Progress").length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Ignored</span>
                  <Badge variant="outline" className="bg-gray-500/10 text-gray-500">
                    {alertsArray.filter((a) => a.status === "Ignored").length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Closed</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500">
                    {alertsArray.filter((a) => a.status === "Closed").length}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Alert Feed</CardTitle>
          <Tabs
            defaultValue="all"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as AlertStatus | "all")}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="New">New</TabsTrigger>
              <TabsTrigger value="In Progress">In Progress</TabsTrigger>
              <TabsTrigger value="Ignored">Ignored</TabsTrigger>
              <TabsTrigger value="Closed">Closed</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <AnimatePresence>
              <div className="space-y-4">
                {filteredAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">No alerts found</h3>
                    <p className="text-muted-foreground">There are no alerts matching your current filter.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Current filters: Time Range: {filters.timeRange}, Status: {filters.status}, Severity:{" "}
                      {filters.severity}
                    </p>
                    <p className="text-sm text-muted-foreground">Total alerts in database: {alertsArray.length}</p>
                  </div>
                ) : (
                  filteredAlerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${severityColor(alert.severity)}`} />
                          <div>
                            <h3 className="font-medium">{alert.title}</h3>
                            <p className="text-sm text-muted-foreground">{alert.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="outline" className={`${statusColor(alert.status)} bg-opacity-10`}>
                            {alert.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            <SafeDate date={alert.created_at || alert.timestamp} />
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">
                            Source: {alert.metadata?.source || alert.integration_source || "Unknown"}
                          </span>
                          {alert.metadata?.srcip && alert.metadata?.dstip && (
                            <span className="text-xs text-muted-foreground">
                              {alert.metadata.srcip} → {alert.metadata.dstip}
                            </span>
                          )}
                          {alert.metadata?.assignee && (
                            <span className="text-xs text-muted-foreground">Assignee: {alert.metadata.assignee}</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedAlert(alert)}>
                            Details
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedAlert(alert)}>
                                Update Status
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Update Alert Status</DialogTitle>
                                <DialogDescription>
                                  Change the status of this alert and add optional comments.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="status">Status</Label>
                                  <Select
                                    value={updateStatus}
                                    onValueChange={(value) => setUpdateStatus(value as AlertStatus)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="New">New</SelectItem>
                                      <SelectItem value="In Progress">In Progress</SelectItem>
                                      <SelectItem value="Ignored">Ignored</SelectItem>
                                      <SelectItem value="Closed">Closed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="comments">Comments</Label>
                                  <Textarea
                                    id="comments"
                                    placeholder="Add comments about this status change..."
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={handleUpdateStatus}>Update Status</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Alert Details Dialog */}
      {selectedAlert && (
        <Dialog open={true} onOpenChange={() => setSelectedAlert(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Alert Details</DialogTitle>
              <DialogDescription>Detailed information about the selected alert</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  Alert ID:
                  <span className="text-sm text-ellipsis overflow-hidden whitespace-nowrap max-w-[220px] inline-block font-mono">
                    {truncateAlertId(selectedAlert.metadata?.alert_id || selectedAlert.external_id || "N/A")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-0"
                    onClick={() =>
                      copyToClipboard(selectedAlert.metadata?.alert_id || selectedAlert.external_id || "", "alertId")
                    }
                    aria-label="Copy Alert ID"
                    disabled={!isClient}
                  >
                    <Copy className={`h-4 w-4 ${copiedAlertId ? "text-green-500" : "text-muted-foreground"}`} />
                  </Button>
                </h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Alert Time:</span>
                    <span className="text-sm">
                      <SafeDate
                        date={selectedAlert.metadata?.alert_time || selectedAlert.timestamp || selectedAlert.created_at}
                      />
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Severity:</span>
                    <Badge className={severityColor(selectedAlert.severity)}>{selectedAlert.severity}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Status:</span>
                    <Badge className={statusColor(selectedAlert.status)}>{selectedAlert.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Alert Type:</span>
                    <span className="text-sm">
                      {selectedAlert.metadata?.alert_type || selectedAlert.metadata?.event_type || "N/A"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Source:</span>
                    <span className="text-sm">
                      {selectedAlert.metadata?.source || selectedAlert.integration_source || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Network Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Network Information</h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Source IP:</span>
                    <span className="text-sm font-mono">{selectedAlert.metadata?.srcip || "N/A"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Source Port:</span>
                    <span className="text-sm">{selectedAlert.metadata?.srcport || "N/A"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Source MAC:</span>
                    <span className="text-sm font-mono">{selectedAlert.metadata?.srcmac || "N/A"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Source Reputation:</span>
                    <span className="text-sm">{selectedAlert.metadata?.srcip_reputation || "N/A"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Destination IP:</span>
                    <span className="text-sm font-mono">{selectedAlert.metadata?.dstip || "N/A"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Destination Port:</span>
                    <span className="text-sm">{selectedAlert.metadata?.dstport || "N/A"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Destination Reputation:</span>
                    <span className="text-sm">{selectedAlert.metadata?.dstip_reputation || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Application Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Application Information</h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">App Family:</span>
                    <span className="text-sm">{selectedAlert.metadata?.appid_family || "N/A"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">App Name:</span>
                    <span className="text-sm">{selectedAlert.metadata?.appid_name || "N/A"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Standard Port:</span>
                    <span className="text-sm">{selectedAlert.metadata?.appid_stdport || "N/A"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Repeat Count:</span>
                    <span className="text-sm">{selectedAlert.metadata?.repeat_count || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Assignment & Comments */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Assignment & Actions</h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Assignee:</span>
                    <span className="text-sm">{selectedAlert.metadata?.assignee || "Unassigned"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Username:</span>
                    <span className="text-sm">{selectedAlert.metadata?.srcip_username || "N/A"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Closed Time:</span>
                    <span className="text-sm">
                      {selectedAlert.metadata?.closed_time ? (
                        <SafeDate date={selectedAlert.metadata.closed_time} />
                      ) : (
                        "N/A"
                      )}
                    </span>
                  </div>
                  {selectedAlert.metadata?.comment && (
                    <div className="col-span-2">
                      <span className="font-medium">Comments:</span>
                      <div className="mt-1 p-2 bg-muted rounded text-sm">
                        {Array.isArray(selectedAlert.metadata.comment)
                          ? selectedAlert.metadata.comment.map((comment: any, idx: number) => (
                              <div key={idx} className="mb-2 last:mb-0">
                                <div className="font-medium">{comment.comment_user}</div>
                                <div className="text-xs text-muted-foreground">
                                  <SafeDate date={new Date(comment.comment_time)} />
                                </div>
                                <div>{comment.comment}</div>
                              </div>
                            ))
                          : selectedAlert.metadata.comment}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* XDR Description */}
            {selectedAlert.metadata?.xdr_desc && (
              <div className="mt-6">
                <h4 className="font-semibold text-lg mb-2">XDR Description</h4>
                <div className="p-4 bg-muted rounded-lg text-sm">{selectedAlert.metadata.xdr_desc}</div>
              </div>
            )}

            {/* Raw Data */}
            <div className="mt-6">
              <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                Raw Alert Data
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-0"
                  onClick={() => copyToClipboard(JSON.stringify(selectedAlert, null, 2), "rawData")}
                  aria-label="Copy Raw Alert Data"
                  disabled={!isClient}
                >
                  <Copy className={`h-4 w-4 ${copiedRawData ? "text-green-500" : "text-muted-foreground"}`} />
                </Button>
              </h4>
              <div className="max-h-[300px] overflow-y-auto rounded bg-muted text-sm p-4 whitespace-pre-wrap font-mono">
                {JSON.stringify(selectedAlert, null, 2)}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
