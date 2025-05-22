import { create } from "zustand"
import type { Integration } from "@/lib/types/integration"

interface IntegrationState {
  integrations: Integration[]
  loading: boolean
  error: string | null
  fetchIntegrations: () => Promise<void>
  addIntegration: (integration: Omit<Integration, "id">) => Promise<Integration | null>
  updateIntegration: (id: string, integration: Partial<Integration>) => Promise<Integration | null>
  deleteIntegration: (id: string) => Promise<boolean>
  testIntegration: (integration: Integration) => Promise<{ success: boolean; message: string }>
}

export const useIntegrationStore = create<IntegrationState>((set, get) => ({
  integrations: [],
  loading: false,
  error: null,

  fetchIntegrations: async () => {
    set({ loading: true, error: null })
    try {
      // Tambahkan timestamp untuk mencegah caching
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/integrations?_t=${timestamp}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      if (!response.ok) {
        // Jika error 405, coba gunakan dummy data untuk development
        if (response.status === 405) {
          console.warn("Method not allowed, using dummy data for development")
          set({
            integrations: [],
            loading: false,
          })
          return
        }
        throw new Error(`Failed to fetch integrations: ${response.status}`)
      }

      const data = await response.json()
      set({
        integrations: Array.isArray(data) ? data : [],
        loading: false,
      })
    } catch (error) {
      console.error("Error fetching integrations:", error)
      set({
        error: error instanceof Error ? error.message : "Unknown error",
        loading: false,
        // Gunakan array kosong jika terjadi error
        integrations: [],
      })
    }
  },

  addIntegration: async (integration) => {
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
      }))
      return newIntegration
    } catch (error) {
      console.error("Error adding integration:", error)
      set({
        error: error instanceof Error ? error.message : "Unknown error",
      })
      return null
    }
  },

  updateIntegration: async (id, integration) => {
    try {
      const response = await fetch(`/api/integrations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(integration),
      })

      if (!response.ok) {
        throw new Error(`Failed to update integration: ${response.status}`)
      }

      const updatedIntegration = await response.json()
      set((state) => ({
        integrations: state.integrations.map((i) => (i.id === id ? { ...i, ...updatedIntegration } : i)),
      }))
      return updatedIntegration
    } catch (error) {
      console.error("Error updating integration:", error)
      set({
        error: error instanceof Error ? error.message : "Unknown error",
      })
      return null
    }
  },

  deleteIntegration: async (id) => {
    try {
      const response = await fetch(`/api/integrations/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Failed to delete integration: ${response.status}`)
      }

      set((state) => ({
        integrations: state.integrations.filter((i) => i.id !== id),
      }))
      return true
    } catch (error) {
      console.error("Error deleting integration:", error)
      set({
        error: error instanceof Error ? error.message : "Unknown error",
      })
      return false
    }
  },

  testIntegration: async (integration) => {
    try {
      const response = await fetch("/api/integrations/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(integration),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error("Error testing integration:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },
}))
