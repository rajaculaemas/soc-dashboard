"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Bell, MessageSquare, Search, Shield, Clock, BookOpen, Users, LogOut, Link } from "lucide-react"
import { useAuthStore } from "@/lib/stores/auth-store"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!useAuthStore.getState().isAuthenticated) {
      router.push("/login")
    }
  }, [router])

  if (!user) return null

  const navigation = [
    { name: "Alert Panel", href: "/dashboard", icon: Bell },
    { name: "Chat with SOCGPT", href: "/dashboard/chat", icon: MessageSquare },
    { name: "Log Explorer", href: "/dashboard/logs", icon: Search },
    { name: "SOARGPT Playbook", href: "/dashboard/playbook", icon: Shield },
    { name: "Incident Timeline", href: "/dashboard/incidents", icon: Clock },
    { name: "Training Center", href: "/dashboard/training", icon: BookOpen },
    { name: "Integrations", href: "/dashboard/integrations", icon: Link },
  ]

  // Only show admin pages for admin role
  if (user.role === "admin") {
    navigation.push({ name: "Role & Audit", href: "/dashboard/admin", icon: Users })
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <Sidebar>
          <SidebarHeader className="flex items-center px-4 py-2">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">AI Driven SecOps</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <a href={item.href}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <div className="px-3 py-2">
              <div className="flex items-center space-x-3 rounded-md border p-3">
                <img src={user.avatar || "/placeholder.svg"} alt={user.name} className="h-10 w-10 rounded-full" />
                <div className="flex-1 truncate">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </SidebarProvider>
  )
}
