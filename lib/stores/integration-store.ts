import { create } from "zustand"
import { persist } from "zustand/middleware"
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

export const useIntegrationStore = create<IntegrationState>()(
  persist(
    (set, get) => ({
      integrations: [
        // Stellar Cyber integration that was already set up
        {
          id: "stellar-cyber-1",
          name: "Stellar Cyber SIEM",
          type: "alert",
          source: "stellar-cyber",
          status: "connected", // Default to connected even if credentials are missing
          method: "api",
          credentials: [
            {
              key: "STELLAR_CYBER_HOST",
              value: process.env.STELLAR_CYBER_HOST || "localhost",
              isSecret: false,
            },
            {
              key: "STELLAR_CYBER_USER_ID",
              value: process.env.STELLAR_CYBER_USER_ID || "demo@example.com",
              isSecret: false,
            },
            {
              key: "STELLAR_CYBER_REFRESH_TOKEN",
              value: process.env.STELLAR_CYBER_REFRESH_TOKEN || "demo-token",
              isSecret: true,
            },
            {
              key: "STELLAR_CYBER_TENANT_ID",
              value: process.env.STELLAR_CYBER_TENANT_ID || "demo-tenant",
              isSecret: false,
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastSyncAt: new Date().toISOString(),
          description: "Stellar Cyber SIEM integration for alert ingestion",
          icon: "/icons/stellar-cyber.svg",
        },
      ],
      loading: false,
      error: null,

      fetchIntegrations: async () => {
        set({ loading: true, error: null })
        try {
          // In a real app, this would be an API call
          // For demo purposes, we'll just use the stored data
          await new Promise((resolve) => setTimeout(resolve, 500))
          set({ loading: false })
        } catch (error) {
          console.error("Error fetching integrations:", error)
          set({ error: (error as Error).message, loading: false })
        }
      },

      addIntegration: async (integration) => {
        set({ loading: true, error: null })
        try {
          // In a real app, this would be an API call
          await new Promise((resolve) => setTimeout(resolve, 1000))

          // Test the connection before adding
          const status = await get().testConnection(integration)

          const newIntegration: Integration = {
            ...integration,
            id: `${integration.source}-${Date.now()}`,
            status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

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
          // In a real app, this would be an API call
          await new Promise((resolve) => setTimeout(resolve, 1000))

          // If credentials are updated, test the connection
          let status: IntegrationStatus | undefined
          if (updates.credentials) {
            const integration = get().integrations.find((i) => i.id === id)
            if (integration) {
              const updatedIntegration = {
                ...integration,
                ...updates,
              }
              status = await get().testConnection(updatedIntegration)
            }
          }

          set((state) => ({
            integrations: state.integrations.map((integration) =>
              integration.id === id
                ? {
                    ...integration,
                    ...updates,
                    status: status || integration.status,
                    updatedAt: new Date().toISOString(),
                  }
                : integration,
            ),
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
          // In a real app, this would be an API call
          await new Promise((resolve) => setTimeout(resolve, 1000))

          set((state) => ({
            integrations: state.integrations.filter((integration) => integration.id !== id),
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
          const integration = get().integrations.find((i) => i.id === id)
          if (!integration) {
            throw new Error("Integration not found")
          }

          const status = await get().checkIntegrationStatus(id)

          // Update the integration status
          set((state) => ({
            integrations: state.integrations.map((i) =>
              i.id === id
                ? {
                    ...i,
                    status,
                    updatedAt: new Date().toISOString(),
                    lastSyncAt: status === "connected" ? new Date().toISOString() : i.lastSyncAt,
                  }
                : i,
            ),
            loading: false,
          }))

          return status === "connected"
        } catch (error) {
          console.error("Error testing integration:", error)
          set({ error: (error as Error).message, loading: false })
          return false
        }
      },

      // Helper function to test connection for a new or updated integration
      testConnection: async (integration: Partial<Integration>): Promise<IntegrationStatus> => {
        try {
          // In a real app, this would test the actual connection
          // For demo purposes, we'll simulate different statuses based on the integration source
          await new Promise((resolve) => setTimeout(resolve, 1000))

          // Simulate different connection statuses for demo purposes
          if (integration.source === "stellar-cyber") {
            // Check if Stellar Cyber credentials are valid
            const hostCred = integration.credentials?.find((c) => c.key === "STELLAR_CYBER_HOST")
            const userIdCred = integration.credentials?.find((c) => c.key === "STELLAR_CYBER_USER_ID")
            const tokenCred = integration.credentials?.find((c) => c.key === "STELLAR_CYBER_REFRESH_TOKEN")

            if (!hostCred?.value || !userIdCred?.value || !tokenCred?.value) {
              return "disconnected"
            }

            // Simulate API call to check connection
            // In a real app, you would make an actual API call to verify the connection
            const isConnected = Math.random() > 0.2 // 80% chance of success for demo
            return isConnected ? "connected" : "error"
          } else if (integration.source === "firewall") {
            return Math.random() > 0.3 ? "connected" : "disconnected"
          } else if (integration.source === "edr") {
            return Math.random() > 0.4 ? "connected" : "error"
          } else if (integration.source === "endpoint" && integration.method === "agent") {
            return "pending" // Agents typically start in pending state
          } else {
            return Math.random() > 0.5 ? "connected" : "disconnected"
          }
        } catch (error) {
          console.error("Error testing connection:", error)
          return "error"
        }
      },

      checkIntegrationStatus: async (id) => {
        try {
          const integration = get().integrations.find((i) => i.id === id)
          if (!integration) {
            throw new Error("Integration not found")
          }

          // In a real app, this would check the actual status of the integration
          // For demo purposes, we'll simulate different statuses
          await new Promise((resolve) => setTimeout(resolve, 800))

          // Simulate different statuses for demo purposes
          if (integration.source === "stellar-cyber") {
            // Check if we can connect to Stellar Cyber API
            try {
              // Simulate API call to check connection
              const isConnected = Math.random() > 0.2 // 80% chance of success for demo
              return isConnected ? "connected" : "error"
            } catch (error) {
              return "error"
            }
          } else if (integration.method === "agent") {
            // For agents, check if they're reporting in
            const lastSyncTime = integration.lastSyncAt ? new Date(integration.lastSyncAt).getTime() : 0
            const currentTime = Date.now()
            const timeDiff = currentTime - lastSyncTime

            // If last sync was more than 5 minutes ago, consider it disconnected
            if (timeDiff > 5 * 60 * 1000) {
              return "disconnected"
            } else {
              return "connected"
            }
          } else {
            // For other integrations, simulate a status check
            const rand = Math.random()
            if (rand < 0.7) return "connected"
            if (rand < 0.9) return "disconnected"
            return "error"
          }
        } catch (error) {
          console.error("Error checking integration status:", error)
          return "error"
        }
      },

      checkAllIntegrationsStatus: async () => {
        try {
          const { integrations } = get()

          // Check status for each integration
          for (const integration of integrations) {
            const status = await get().checkIntegrationStatus(integration.id)

            // Update the integration status if it changed
            if (status !== integration.status) {
              set((state) => ({
                integrations: state.integrations.map((i) =>
                  i.id === integration.id
                    ? {
                        ...i,
                        status,
                        updatedAt: new Date().toISOString(),
                        lastSyncAt: status === "connected" ? new Date().toISOString() : i.lastSyncAt,
                      }
                    : i,
                ),
              }))
            }
          }
        } catch (error) {
          console.error("Error checking all integrations status:", error)
        }
      },
    }),
    {
      name: "integration-storage",
    },
  ),
)
