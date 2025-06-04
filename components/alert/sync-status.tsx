"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react"
import { useIntegrationStore } from "@/lib/stores/integration-store"
import { SafeDate } from "@/components/ui/safe-date"

export function SyncStatus() {
  const { integrations, fetchIntegrations } = useIntegrationStore()
  const [syncing, setSyncing] = useState(false)
  const [lastAutoSync, setLastAutoSync] = useState<Date | null>(null)

  const stellarIntegrations = integrations.filter((i) => i.source === "stellar-cyber")

  const handleManualSync = async () => {
    try {
      setSyncing(true)

      const response = await fetch("/api/alerts/auto-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        setLastAutoSync(new Date())
        await fetchIntegrations() // Refresh integration data
      }
    } catch (error) {
      console.error("Manual sync failed:", error)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchIntegrations()
  }, [])

  if (stellarIntegrations.length === 0) {
    return null
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Integration Sync Status</CardTitle>
            <CardDescription>Monitor the sync status of your Stellar Cyber integrations</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleManualSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Manual Sync"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stellarIntegrations.map((integration) => (
            <div key={integration.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {integration.status === "connected" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">{integration.name}</span>
                </div>
                <Badge variant={integration.status === "connected" ? "default" : "destructive"}>
                  {integration.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {integration.lastSyncAt ? (
                  <span>
                    Last sync: <SafeDate date={integration.lastSyncAt} />
                  </span>
                ) : (
                  <span>Never synced</span>
                )}
              </div>
            </div>
          ))}

          {lastAutoSync && (
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Last manual sync: <SafeDate date={lastAutoSync.toISOString()} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
