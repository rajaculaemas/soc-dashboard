"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Users, Search, Plus, Edit, Eye, Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Switch } from "@/components/ui/switch"
import { useAuthStore, type UserRole } from "@/lib/stores/auth-store"

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  status: "active" | "inactive" | "pending"
  lastLogin?: string
  avatar?: string
}

interface AuditLog {
  id: string
  user: {
    name: string
    email: string
    avatar?: string
  }
  action: string
  resource: string
  timestamp: string
  ip: string
  status: "success" | "failure"
  details?: string
}

export default function AdminPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
      status: "active",
      lastLogin: "2023-05-15T08:30:00Z",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: "2",
      name: "Security Analyst",
      email: "analyst@example.com",
      role: "analyst",
      status: "active",
      lastLogin: "2023-05-14T14:45:00Z",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: "3",
      name: "SOC Operator",
      email: "operator@example.com",
      role: "operator",
      status: "active",
      lastLogin: "2023-05-13T11:20:00Z",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: "4",
      name: "Security Trainee",
      email: "trainee@example.com",
      role: "trainee",
      status: "active",
      lastLogin: "2023-05-12T09:15:00Z",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: "5",
      name: "New Analyst",
      email: "new.analyst@example.com",
      role: "analyst",
      status: "pending",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  ])

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: "log-1",
      user: {
        name: "Admin User",
        email: "admin@example.com",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      action: "login",
      resource: "system",
      timestamp: "2023-05-15T08:30:00Z",
      ip: "192.168.1.100",
      status: "success",
    },
    {
      id: "log-2",
      user: {
        name: "Security Analyst",
        email: "analyst@example.com",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      action: "view",
      resource: "alert",
      timestamp: "2023-05-15T09:15:00Z",
      ip: "192.168.1.101",
      status: "success",
    },
    {
      id: "log-3",
      user: {
        name: "SOC Operator",
        email: "operator@example.com",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      action: "update",
      resource: "incident",
      timestamp: "2023-05-15T10:45:00Z",
      ip: "192.168.1.102",
      status: "success",
    },
    {
      id: "log-4",
      user: {
        name: "Unknown User",
        email: "unknown@example.com",
      },
      action: "login",
      resource: "system",
      timestamp: "2023-05-15T11:30:00Z",
      ip: "203.0.113.100",
      status: "failure",
      details: "Invalid credentials",
    },
    {
      id: "log-5",
      user: {
        name: "Admin User",
        email: "admin@example.com",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      action: "create",
      resource: "user",
      timestamp: "2023-05-15T12:15:00Z",
      ip: "192.168.1.100",
      status: "success",
      details: "Created user: new.analyst@example.com",
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [refreshing, setRefreshing] = useState(false)

  // Redirect if not admin
  useEffect(() => {
    if (user?.role !== "admin") {
      router.push("/dashboard")
    }
  }, [user, router])

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchTerm === "" ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === "all" || user.role === roleFilter
    const matchesStatus = statusFilter === "all" || user.status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesSearch =
      searchTerm === "" ||
      log.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip.includes(searchTerm)

    const matchesAction = actionFilter === "all" || log.action === actionFilter

    return matchesSearch && matchesAction
  })

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500/10 text-red-500">Admin</Badge>
      case "analyst":
        return <Badge className="bg-blue-500/10 text-blue-500">Analyst</Badge>
      case "operator":
        return <Badge className="bg-green-500/10 text-green-500">Operator</Badge>
      case "trainee":
        return <Badge className="bg-yellow-500/10 text-yellow-500">Trainee</Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500">
            Active
          </Badge>
        )
      case "inactive":
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-500">
            Inactive
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
            Pending
          </Badge>
        )
      default:
        return null
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "login":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
            Login
          </Badge>
        )
      case "logout":
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-500">
            Logout
          </Badge>
        )
      case "create":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500">
            Create
          </Badge>
        )
      case "update":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
            Update
          </Badge>
        )
      case "delete":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500">
            Delete
          </Badge>
        )
      case "view":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
            View
          </Badge>
        )
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-500"
      case "failure":
        return "text-red-500"
      default:
        return ""
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role & Audit Management</h1>
          <p className="text-muted-foreground">Manage user roles and review system audit logs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                      <DialogDescription>
                        Create a new user account with appropriate role and permissions.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" placeholder="John Doe" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="john.doe@example.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select defaultValue="analyst">
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="analyst">Analyst</SelectItem>
                            <SelectItem value="operator">Operator</SelectItem>
                            <SelectItem value="trainee">Trainee</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="active" defaultChecked />
                        <Label htmlFor="active">Active Account</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Create User</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search users..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="trainee">Trainee</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <h3 className="text-lg font-medium">No users found</h3>
                        <p className="text-muted-foreground">Try adjusting your search or filters</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar || "/placeholder.svg"} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>
                          {user.lastLogin ? (
                            <div className="text-sm">{new Date(user.lastLogin).toLocaleString()}</div>
                          ) : (
                            <div className="text-sm text-muted-foreground">Never</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Eye className="h-4 w-4" />
                                  <span className="sr-only">View</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>User Details</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="flex justify-center mb-4">
                                    <Avatar className="h-20 w-20">
                                      <AvatarImage src={user.avatar || "/placeholder.svg"} />
                                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-sm text-muted-foreground">Name</div>
                                      <div className="font-medium">{user.name}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-muted-foreground">Email</div>
                                      <div className="font-medium">{user.email}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-muted-foreground">Role</div>
                                      <div>{getRoleBadge(user.role)}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-muted-foreground">Status</div>
                                      <div>{getStatusBadge(user.status)}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-muted-foreground">User ID</div>
                                      <div className="font-mono text-sm">{user.id}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-muted-foreground">Last Login</div>
                                      <div>
                                        {user.lastLogin ? (
                                          new Date(user.lastLogin).toLocaleString()
                                        ) : (
                                          <span className="text-muted-foreground">Never</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">{/* Audit Logs Content */}</TabsContent>
      </Tabs>
    </div>
  )
}
