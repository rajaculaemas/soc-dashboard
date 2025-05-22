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
      const response = await fetch("/api/integrations")

      if (!response.ok) {
        throw new Error(`Failed to fetch integrations: ${response.status}`)
      }

      const data = await response.json()
      set({ integrations: data, loading: false })
    } catch (error) {
      console.error("Error fetching integrations:", error)
      set({ error: (error as Error).message, loading: false })
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
