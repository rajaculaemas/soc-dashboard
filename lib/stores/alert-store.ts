import { create } from "zustand"
import type { AlertStatus } from "@/lib/config/stellar-cyber"

interface Alert {
  id: string
  externalId?: string
  index?: string
  title: string
  description?: string
  severity: string
  status: string
  source: string
  timestamp: string
  score?: number
  metadata?: any
  integrationId: string
  integration?: {
    id: string
    name: string
    source: string
  }
}

interface AlertState {
  alerts: Alert[]
  loading: boolean
  error: string | null
  activeTab: AlertStatus | "all"
  fetchAlerts: (params?: { status?: AlertStatus }) => Promise<void>
  updateAlertStatus: (params: {
    alertId: string
    status: AlertStatus
    comments?: string
  }) => Promise<void>
  syncAlerts: (integrationId: string) => Promise<void>
  setActiveTab: (tab: AlertStatus | "all") => void
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  loading: false,
  error: null,
  activeTab: "all",

  fetchAlerts: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const queryParams = new URLSearchParams()
      if (params.status && params.status !== "all") {
        queryParams.append("status", params.status)
      }

      // Tambahkan timestamp untuk mencegah caching
      queryParams.append("_t", Date.now().toString())

      const response = await fetch(`/api/alerts?${queryParams.toString()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.status}`)
      }

      const data = await response.json()

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error("API did not return valid data")
      }

      set({ alerts: data.data, loading: false })
    } catch (error) {
      console.error("Error fetching alerts:", error)
      set({ error: (error as Error).message, loading: false })
    }
  },

  updateAlertStatus: async ({ alertId, status, comments }) => {
    try {
      const response = await fetch("/api/alerts/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alertId,
          status,
          comments,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update alert status: ${response.status}`)
      }

      // Refresh alerts after update
      await get().fetchAlerts()
    } catch (error) {
      console.error("Error updating alert status:", error)
      set({ error: (error as Error).message })
    }
  },

  syncAlerts: async (integrationId) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch("/api/alerts/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          integrationId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to sync alerts: ${response.status}`)
      }

      const result = await response.json()

      // Refresh alerts after sync
      await get().fetchAlerts()

      return result
    } catch (error) {
      console.error("Error syncing alerts:", error)
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab })
    if (tab !== "all") {
      get().fetchAlerts({ status: tab as AlertStatus })
    } else {
      get().fetchAlerts()
    }
  },
}))
