import { create } from "zustand"
import type { AlertStatus, StellarCyberAlert } from "@/lib/config/stellar-cyber"

interface AlertState {
  alerts: StellarCyberAlert[]
  loading: boolean
  error: string | null
  activeTab: AlertStatus | "all"
  fetchAlerts: (params?: { status?: AlertStatus }) => Promise<void>
  updateAlertStatus: (params: {
    index: number
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

      console.log("Alert Store: Fetching alerts with params:", params)

      // Tambahkan timestamp untuk mencegah caching
      queryParams.append("_t", Date.now().toString())

      const response = await fetch(`/api/alerts?${queryParams.toString()}`, {
        // Tambahkan opsi cache: 'no-store' untuk mencegah caching
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      console.log("Alert Store: Response status:", response.status)

      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Alert Store: Received data:", data.length ? `${data.length} alerts` : "No alerts or invalid format")

      // Validasi format data
      if (!Array.isArray(data)) {
        throw new Error("API did not return an array")
      }

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
