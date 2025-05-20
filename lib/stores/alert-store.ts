import { create } from "zustand"
import type { AlertStatus, StellarCyberAlert } from "@/lib/config/stellar-cyber"

interface AlertState {
  alerts: StellarCyberAlert[]
  loading: boolean
  error: string | null
  activeTab: AlertStatus | "all"
  fetchAlerts: (params?: { status?: AlertStatus }) => Promise<void>
  updateAlertStatus: (params: {
    index: string
    alertId: string
    status: AlertStatus
    comments?: string
  }) => Promise<void>
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

      const response = await fetch(`/api/alerts?${queryParams.toString()}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      set({ alerts: data, loading: false })
    } catch (error) {
      console.error("Error fetching alerts:", error)
      set({ error: (error as Error).message, loading: false })
    }
  },

  updateAlertStatus: async ({ index, alertId, status, comments }) => {
    try {
      const response = await fetch("/api/alerts/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          index,
          alertId,
          status,
          comments,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update alert status: ${response.status} ${response.statusText}`)
      }

      // Refresh alerts after update
      await get().fetchAlerts()
    } catch (error) {
      console.error("Error updating alert status:", error)
      set({ error: (error as Error).message })
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
