"use client"

import { Bell, MessageSquare, Search, BookOpen, GraduationCap, Settings, Shield, Ticket, User } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"

const menuItems = [
  {
    title: "Alert Panel",
    url: "/dashboard",
    icon: Bell,
  },
  {
    title: "Chat with SOCGPT",
    url: "/dashboard/chat",
    icon: MessageSquare,
  },
  {
    title: "Log Explorer",
    url: "/dashboard/logs",
    icon: Search,
  },
  {
    title: "SOARGPT Playbook",
    url: "/dashboard/playbook",
    icon: BookOpen,
  },
  {
    title: "Incident Timeline",
    url: "/dashboard/incidents",
    icon: Ticket,
  },
  {
    title: "Tickets",
    url: "/dashboard/tickets",
    icon: Ticket,
  },
  {
    title: "Training Center",
    url: "/dashboard/training",
    icon: GraduationCap,
  },
  {
    title: "Integrations",
    url: "/dashboard/integrations",
    icon: Settings,
  },
  {
    title: "Role & Audit",
    url: "/dashboard/admin",
    icon: Shield,
  },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <Shield className="h-6 w-6" />
          <span className="font-semibold">AI Driven SecOps</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-4 py-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder.svg?height=32&width=32" />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">admin</span>
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
