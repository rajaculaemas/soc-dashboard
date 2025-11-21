"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  FolderSyncIcon as Sync,
  Eye,
  TrendingUp,
  TrendingDown,
  Activity,
  Timer,
  AlertTriangle,
  Edit,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { CaseDetailDialog } from "@/components/case/case-detail-dialog"
import { CaseActionDialog } from "@/components/case/case-action-dialog"
import { formatDistanceToNow } from "date-fns"
import { format } from "date-fns"

interface Integration {
  id: string
  name: string
  source: string
  status: string
  lastSync: Date | null
}

interface Case {
  id: string
  externalId: string
  name: string
  status: string
  severity: string
  assignee: string | null
  assigneeName: string | null
  createdAt: Date
  modifiedAt: Date | null
  ticketId: number
  score: number | null
  size: number | null
  integration: {
    id: string
    name: string
  }
}

interface CaseStats {
  total: number
  open: number
  inProgress: number
  resolved: number
  critical: number
  avgMttd: number
}

const statusColors = {
  New: "bg-blue-100 text-blue-800",
  "In Progress": "bg-yellow-100 text-yellow-800",
  Resolved: "bg-green-100 text-green-800",
  Cancelled: "bg-gray-100 text-gray-800",
  Closed: "bg-gray-100 text-gray-800",
}

const severityColors = {
  Critical: "bg-red-100 text-red-800",
  High: "bg-orange-100 text-orange-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-green-100 text-green-800",
}

const statusIcons = {
  New: AlertCircle,
  "In Progress": Clock,
  Resolved: CheckCircle,
  Cancelled: XCircle,
  Closed: CheckCircle,
}

export default function TicketsPage() {
  const [cases, setCases] = useState<Case[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [stats, setStats] = useState<CaseStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    critical: 0,
    avgMttd: 0,
  })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<string>("all")
  const [timeRange, setTimeRange] = useState("7d")
  const [statusFilter, setStatusFilter] = useState("")
  const [severityFilter, setSeverityFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)
  const [actionCase, setActionCase] = useState<Case | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const { toast } = useToast()

  // Fetch integrations
  const fetchIntegrations = async () => {
    try {
      const response = await fetch("/api/integrations")
      const data = await response.json()

      if (data.success) {
        setIntegrations(data.data)
        // Auto-select first integration if none selected
        if (!selectedIntegration && data.data.length > 0) {
          setSelectedIntegration(data.data[0].id)
        }
      }
    } catch (error) {
      console.error("Error fetching integrations:", error)
      toast({
        title: "Error",
        description: "Failed to fetch integrations",
        variant: "destructive",
      })
    }
  }

  // Fetch cases
  const fetchCases = async () => {
    if (!selectedIntegration || selectedIntegration === "all") return

    try {
      console.log("Fetching cases with params:", {
        integrationId: selectedIntegration,
        time_range: timeRange,
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      })

      const params = new URLSearchParams({
        integrationId: selectedIntegration,
        time_range: timeRange,
        ...(statusFilter && { status: statusFilter }),
        ...(severityFilter && { severity: severityFilter }),
      })

      const response = await fetch(`/api/cases?${params}`)
      const data = await response.json()

      if (data.success) {
        setCases(data.data)
        setStats(data.stats)
        console.log("Fetched cases:", data.data.length)
      } else {
        console.error("Failed to fetch cases:", data.error)
        toast({
          title: "Error",
          description: data.error || "Failed to fetch cases",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching cases:", error)
      toast({
        title: "Error",
        description: "Failed to fetch cases",
        variant: "destructive",
      })
    }
  }

  // Sync cases
  const syncCases = async () => {
    if (!selectedIntegration || selectedIntegration === "all") {
      toast({
        title: "Error",
        description: "Please select an integration first",
        variant: "destructive",
      })
      return
    }

    setSyncing(true)
    try {
      console.log("Starting case sync for integration:", selectedIntegration)

      const response = await fetch("/api/cases/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          integrationId: selectedIntegration,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: `Sync completed: ${data.stats.created} new, ${data.stats.updated} updated`,
        })

        // Auto refresh data after successful sync
        console.log("Sync completed, refreshing data...")
        await fetchCases()
        await fetchIntegrations() // Refresh to update last sync time
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to sync cases",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error syncing cases:", error)
      toast({
        title: "Error",
        description: "Failed to sync cases",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  // Manual refresh
  const refreshData = async () => {
    setRefreshing(true)
    try {
      console.log("Manual refresh triggered")
      await Promise.all([fetchCases(), fetchIntegrations()])
      toast({
        title: "Success",
        description: "Data refreshed successfully",
      })
    } catch (error) {
      console.error("Error refreshing data:", error)
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  // Handle case action (edit)
  const handleCaseAction = (caseItem: Case) => {
    console.log("Opening case action dialog for:", caseItem)
    setActionCase(caseItem)
    setActionDialogOpen(true)
  }

  // Handle case detail (view)
  const handleCaseDetail = (caseItem: Case) => {
    console.log("Opening case detail dialog for:", caseItem)
    setSelectedCase(caseItem)
    setDetailDialogOpen(true)
  }

  // Handle case update
  const handleCaseUpdate = async () => {
    // Refresh the cases data after update
    await fetchCases()

    toast({
      title: "Success",
      description: "Case updated successfully",
    })
  }

  // Filter cases based on search term
  const filteredCases = cases.filter(
    (caseItem) =>
      caseItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.externalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (caseItem.assigneeName && caseItem.assigneeName.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Load data on mount and when filters change
  useEffect(() => {
    fetchIntegrations()
  }, [])

  useEffect(() => {
    if (selectedIntegration && selectedIntegration !== "all") {
      setLoading(true)
      fetchCases().finally(() => setLoading(false))
    }
  }, [selectedIntegration, timeRange, statusFilter, severityFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Tickets</h1>
          <p className="text-muted-foreground">
            {syncing ? "Sync in progress..." : "Manage and track security incidents and cases"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={refreshData} disabled={refreshing || syncing} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={syncCases}
            disabled={syncing || !selectedIntegration || selectedIntegration === "all"}
            size="sm"
          >
            <Sync className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Cases"}
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              <Activity className="h-3 w-3 inline mr-1" />
              Being worked on
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              Completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              High priority
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg MTTD</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgMttd}m</div>
            <p className="text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 inline mr-1" />
              Mean time to detect
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter cases by integration, time range, status, and severity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="integration">Integration</Label>
              <Select value={selectedIntegration} onValueChange={setSelectedIntegration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select integration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Integrations</SelectItem>
                  {integrations.map((integration) => (
                    <SelectItem key={integration.id} value={integration.id}>
                      {integration.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeRange">Time Range</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">Last 12 Hours</SelectItem>
                  <SelectItem value="1d">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Severity" />
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
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search cases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cases ({filteredCases.length})</CardTitle>
          <CardDescription>Showing {filteredCases.length} cases</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading cases...</span>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No cases found</h3>
              <p className="text-muted-foreground mb-4">
                {selectedIntegration
                  ? "No cases match your current filters. Try adjusting the time range or filters."
                  : "Please select an integration to view cases."}
              </p>
              {selectedIntegration && selectedIntegration !== "all" && (
                <Button onClick={syncCases} disabled={syncing}>
                  <Sync className="h-4 w-4 mr-2" />
                  Sync Cases
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>MTTD</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map((caseItem) => {
                    const StatusIcon = statusIcons[caseItem.status as keyof typeof statusIcons] || AlertCircle
                    return (
                      <TableRow key={caseItem.id}>
                        <TableCell className="font-mono text-sm">#{caseItem.ticketId}</TableCell>
                        <TableCell>
                          <div className="font-medium">{caseItem.name}</div>
                          <div className="text-sm text-muted-foreground">{caseItem.externalId}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              statusColors[caseItem.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
                            }
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {caseItem.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              severityColors[caseItem.severity as keyof typeof severityColors] ||
                              "bg-gray-100 text-gray-800"
                            }
                          >
                            {caseItem.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                              {caseItem.assigneeName ? caseItem.assigneeName.charAt(0).toUpperCase() : "?"}
                            </div>
                            <span className="text-sm">{caseItem.assigneeName || "Unassigned"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(caseItem.createdAt), "yyyy-MM-dd HH:mm:ss")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">N/A</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleCaseDetail(caseItem)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleCaseAction(caseItem)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Case Detail Dialog */}
      <CaseDetailDialog case={selectedCase} open={detailDialogOpen} onOpenChange={setDetailDialogOpen} />

      {/* Case Action Dialog */}
      <CaseActionDialog
        case={actionCase}
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        onUpdate={handleCaseUpdate}
      />
    </div>
  )
}
