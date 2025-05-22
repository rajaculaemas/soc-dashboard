import { create } from "zustand"
import type { Integration, IntegrationStatus } from "@/lib/types/integration"

interface IntegrationState {
  integrations: Integration[]
  loading: boolean
  error: string | null
  fetchIntegrations: () => Promise<void>
  addIntegration: (integration: Omit<Integration, "id" | "createdAt" | "updatedAt" | "status">) => Promise<void>
  updateIntegration: (id: string, updates: Partial<Integration>) => Promise<void>
  deleteIntegration: (id: string) => Promise<void>
  testIntegration: (id: string) => Promise<boolean>
  checkIntegrationStatus: (id: string) => Promise<IntegrationStatus>
  checkAllIntegrationsStatus: () => Promise<void>
}

export const useIntegrationStore = create<IntegrationState>((set, get) => ({
  integrations: [],
  loading: false,
  error: null,

  fetchIntegrations: async () => {
    set({ loading: true, error: null })
    try {
      console.log("Fetching integrations from API...")

      // Tambahkan timestamp untuk mencegah caching
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/integrations?_t=${timestamp}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        // Jika status 405, coba dengan fallback
        if (response.status === 405) {
          console.warn("GET method not allowed, using fallback data")
          // Gunakan data fallback atau coba dengan metode lain
          set({
            integrations: [],
            loading: false,
          })
          return
        }

        throw new Error(`Failed to fetch integrations: ${response.status}`)
      }

      const data = await response.json()
      console.log(`Fetched ${data.length} integrations`)
      set({ integrations: data, loading: false })
    } catch (error) {
      console.error("Error fetching integrations:", error)
      set({
        error: (error as Error).message,
        loading: false,
        // Tetap gunakan data yang ada atau array kosong jika tidak ada
        integrations: get().integrations.length > 0 ? get().integrations : [],
      })
    }
  },

  addIntegration: async (integration) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(integration),
      })

      if (!response.ok) {
        throw new Error(`Failed to add integration: ${response.status}`)
      }

      const newIntegration = await response.json()
      set((state) => ({
        integrations: [...state.integrations, newIntegration],
        loading: false,
      }))
    } catch (error) {
      console.error("Error adding integration:", error)
      set({ error: (error as Error).message, loading: false })
    }
  },

  updateIntegration: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`/api/integrations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error(`Failed to update integration: ${response.status}`)
      }

      const updatedIntegration = await response.json()
      set((state) => ({
        integrations: state.integrations.map((i) => (i.id === id ? updatedIntegration : i)),
        loading: false,
      }))
    } catch (error) {
      console.error("Error updating integration:", error)
      set({ error: (error as Error).message, loading: false })
    }
  },

  deleteIntegration: async (id) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`/api/integrations/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Failed to delete integration: ${response.status}`)
      }

      set((state) => ({
        integrations: state.integrations.filter((i) => i.id !== id),
        loading: false,
      }))
    } catch (error) {
      console.error("Error deleting integration:", error)
      set({ error: (error as Error).message, loading: false })
    }
  },

  testIntegration: async (id) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch("/api/integrations/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        throw new Error(`Failed to test integration: ${response.status}`)
      }

      const result = await response.json()

      // Refresh integrations to get updated status
      await get().fetchIntegrations()

      return result.success
    } catch (error) {
      console.error("Error testing integration:", error)
      set({ error: (error as Error).message, loading: false })
      return false
    }
  },

  checkIntegrationStatus: async (id) => {
    try {
      const response = await fetch("/api/integrations/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        return "error"
      }

      const result = await response.json()
      return result.success ? "connected" : "error"
    } catch (error) {
      console.error("Error checking integration status:", error)
      return "error"
    }
  },

  checkAllIntegrationsStatus: async () => {
    try {
      const { integrations } = get()

      for (const integration of integrations) {
        await get().checkIntegrationStatus(integration.id)
      }

      // Refresh integrations to get updated statuses
      await get().fetchIntegrations()
    } catch (error) {
      console.error("Error checking all integrations status:", error)
    }
  },
}))
