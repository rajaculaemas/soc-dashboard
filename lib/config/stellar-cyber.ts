export const STELLAR_CYBER_CONFIG = {
  HOST: process.env.STELLAR_CYBER_HOST || "localhost",
  USER_ID: process.env.STELLAR_CYBER_USER_ID || "demo@example.com",
  REFRESH_TOKEN: process.env.STELLAR_CYBER_REFRESH_TOKEN || "demo-token",
  TENANT_ID: process.env.STELLAR_CYBER_TENANT_ID || "demo-tenant",
}

export type AlertStatus = "New" | "In Progress" | "Ignored" | "Closed"

export interface StellarCyberAlert {
  _id: string
  index: string
  title: string
  description: string
  severity: string
  status: AlertStatus
  created_at: string
  updated_at: string
  source: string
  comments?: string
  score?: number
  metadata?: Record<string, any>
}
