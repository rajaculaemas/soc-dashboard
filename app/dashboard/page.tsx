"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, Filter, RefreshCw, AlertCircle, Download } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SafeDate } from "@/components/ui/safe-date"

export default function AlertPanel() {
  const { alerts, loading, error, activeTab, fetchAlerts, updateAlertStatus, setActiveTab, syncAlerts } =
    useAlertStore()
  const { integrations, fetchIntegrations } = useIntegrationStore()
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  const [updateStatus, setUpdateStatus] = useState<AlertStatus>("In Progress")
  const [comments, setComments] = useState("")
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)

  const loadAlerts = async () => {
    try {
      setRefreshing(true)
      await fetchAlerts()
    } catch (error) {
      console.error("Failed to fetch alerts:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleSyncAlerts = async () => {
    if (!selectedIntegration) return

    try {
      setSyncing(true)
      await syncAlerts(selectedIntegration)
      await loadAlerts()
    } catch (error) {
      console.error("Failed to sync alerts:", error)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    loadAlerts()
    fetchIntegrations()

    // Set up polling for real-time updates
    const interval = setInterval(() => {
      loadAlerts()
    }, 30000) // Poll every 30 seconds

    return () => clearInterval(interval)
  }, [])

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

  // Fungsi untuk mengubah severity ke string yang konsisten
  const normalizeSeverity = (value: string | number): string => {
    const map: Record<string | number, string> = {
      100: "critical",
      80: "high",
      60: "medium",
      40: "low",
      critical: "critical",
      high: "high",
      medium: "medium",
      low: "low",
    }

    return map[value] || "medium" // fallback default
  }

  // Prepare data for the severity chart
  const severityCounts = alerts.reduce(
    (acc, alert) => {
      const severity = normalizeSeverity(alert.severity || 40) // bisa angka atau string
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
      case "50":
        return "bg-red-500"
      case "high":
      case "45":
        return "bg-orange-500"
      case "medium":
      case "40":
        return "bg-yellow-500"
      case "low":
      case "30":
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

  const filteredAlerts = activeTab === "all" ? alerts : alerts.filter((alert) => alert.status === activeTab)

  // Filter Stellar Cyber integrations for sync dropdown
  const stellarIntegrations = integrations.filter((i) => i.source === "stellar-cyber" && i.status === "connected")

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Alert Panel</h1>
          <p className="text-muted-foreground">Monitor and respond to security alerts in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAlerts} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {stellarIntegrations.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={selectedIntegration || ""} onValueChange={setSelectedIntegration}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select integration" />
                </SelectTrigger>
                <SelectContent>
                  {stellarIntegrations.map((integration) => (
                    <SelectItem key={integration.id} value={integration.id}>
                      {integration.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleSyncAlerts} disabled={syncing || !selectedIntegration}>
                <Download className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Alerts"}
              </Button>
            </div>
          )}

          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
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
                    {alerts.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">New</span>
                  <Badge variant="outline" className="bg-red-500/10 text-red-500">
                    {alerts.filter((a) => a.status === "New").length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">In Progress</span>
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                    {alerts.filter((a) => a.status === "In Progress").length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Ignored</span>
                  <Badge variant="outline" className="bg-gray-500/10 text-gray-500">
                    {alerts.filter((a) => a.status === "Ignored").length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Closed</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500">
                    {alerts.filter((a) => a.status === "Closed").length}
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
                            <SafeDate date={alert.timestamp} />
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">Source: {alert.source}</span>
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
      {selectedAlert && (
        <Dialog open={true} onOpenChange={() => setSelectedAlert(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alert Raw Data</DialogTitle>
              <DialogDescription>Informasi lengkap dari alert terpilih</DialogDescription>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto rounded bg-muted text-sm p-4 whitespace-pre-wrap font-mono">
              {JSON.stringify(selectedAlert, null, 2)}
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
