"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, Filter, RefreshCw } from "lucide-react"
import { type Alert as AlertType, fetchAlerts } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export default function AlertPanel() {
  const [alerts, setAlerts] = useState<AlertType[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [refreshing, setRefreshing] = useState(false)

  const loadAlerts = async () => {
    try {
      setRefreshing(true)
      const data = await fetchAlerts()
      setAlerts(data)
    } catch (error) {
      console.error("Failed to fetch alerts:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAlerts()

    // Set up polling for real-time updates
    const interval = setInterval(() => {
      loadAlerts()
    }, 30000) // Poll every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const filteredAlerts = activeTab === "all" ? alerts : alerts.filter((alert) => alert.status === activeTab)

  // Prepare data for the severity chart
  const severityCounts = alerts.reduce(
    (acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const chartData = Object.entries(severityCounts).map(([name, value]) => ({ name, value }))

  const severityColor = (severity: string) => {
    switch (severity) {
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

  const statusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-red-500"
      case "investigating":
        return "bg-yellow-500"
      case "resolved":
        return "bg-green-500"
      case "false-positive":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

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
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

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
                    {alerts.filter((a) => a.status === "new").length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Investigating</span>
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                    {alerts.filter((a) => a.status === "investigating").length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Resolved</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500">
                    {alerts.filter((a) => a.status === "resolved").length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">False Positive</span>
                  <Badge variant="outline" className="bg-gray-500/10 text-gray-500">
                    {alerts.filter((a) => a.status === "false-positive").length}
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
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="new">New</TabsTrigger>
              <TabsTrigger value="investigating">Investigating</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="false-positive">False Positive</TabsTrigger>
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
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Source: {alert.source}</span>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            Details
                          </Button>
                          <Button variant="outline" size="sm">
                            Investigate
                          </Button>
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
    </div>
  )
}
