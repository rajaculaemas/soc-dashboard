import type React from "react"
import {
  Shield,
  MessageSquare,
  Search,
  BookOpen,
  TimerIcon as Timeline,
  GraduationCap,
  Settings,
  UserCheck,
  Ticket,
} from "lucide-react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"

const sidebarItems = [
  {
    title: "Alert Panel",
    url: "/dashboard",
    icon: Shield,
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
    icon: Timeline,
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
    icon: UserCheck,
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
