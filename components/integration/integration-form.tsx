"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { AlertCircle, Eye, EyeOff, HelpCircle, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useIntegrationStore } from "@/lib/stores/integration-store"
import type {
  Integration,
  IntegrationCredential,
  IntegrationMethod,
  IntegrationSource,
  IntegrationType,
} from "@/lib/types/integration"

interface IntegrationFormProps {
  integration?: Integration
  onClose: () => void
}

export function IntegrationForm({ integration, onClose }: IntegrationFormProps) {
  const { addIntegration, updateIntegration } = useIntegrationStore()
  const [activeTab, setActiveTab] = useState<IntegrationType>("alert")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [source, setSource] = useState<IntegrationSource>("custom")
  const [method, setMethod] = useState<IntegrationMethod>("api")
  const [credentials, setCredentials] = useState<IntegrationCredential[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (integration) {
      setActiveTab(integration.type)
      setName(integration.name)
      setDescription(integration.description || "")
      setSource(integration.source)
      setMethod(integration.method)
      setCredentials(integration.credentials)
    } else {
      // Default credentials based on method
      if (method === "api") {
        setCredentials([
          { key: "API_URL", value: "", isSecret: false },
          { key: "API_KEY", value: "", isSecret: true },
        ])
      } else if (method === "agent") {
        setCredentials([
          { key: "AGENT_ID", value: "", isSecret: false },
          { key: "AGENT_SECRET", value: "", isSecret: true },
        ])
      } else {
        setCredentials([])
      }
    }
  }, [integration, method])

  const handleAddCredential = () => {
    setCredentials([...credentials, { key: "", value: "", isSecret: false }])
  }

  const handleRemoveCredential = (index: number) => {
    setCredentials(credentials.filter((_, i) => i !== index))
  }

  const handleCredentialChange = (index: number, field: keyof IntegrationCredential, value: any) => {
    setCredentials(
      credentials.map((cred, i) =>
        i === index ? { ...cred, [field]: field === "isSecret" ? !cred.isSecret : value } : cred,
      ),
    )
  }

  const toggleShowSecret = (index: number) => {
    setShowSecrets((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Validate form
      if (!name.trim()) {
        throw new Error("Name is required")
      }

      if (!source) {
        throw new Error("Source is required")
      }

      if (!method) {
        throw new Error("Method is required")
      }

      // Validate credentials
      for (const cred of credentials) {
        if (!cred.key.trim() || !cred.value.trim()) {
          throw new Error("All credential fields are required")
        }
      }

      const integrationData = {
        name,
        type: activeTab,
        source,
        method,
        credentials,
        description,
      }

      if (integration) {
        await updateIntegration(integration.id, integrationData)
      } else {
        await addIntegration(integrationData as any)
      }

      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs
        defaultValue={activeTab}
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as IntegrationType)}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="alert">Alert Integration</TabsTrigger>
          <TabsTrigger value="log">Log Integration</TabsTrigger>
        </TabsList>
        <TabsContent value="alert" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Integration Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Firewall Alerts"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Alert Source</Label>
            <Select value={source} onValueChange={(value) => setSource(value as IntegrationSource)}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stellar-cyber">Stellar Cyber</SelectItem>
                <SelectItem value="firewall">Firewall</SelectItem>
                <SelectItem value="edr">EDR</SelectItem>
                <SelectItem value="antivirus">Antivirus</SelectItem>
                <SelectItem value="siem">Other SIEM</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Integration Method</Label>
            <Select value={method} onValueChange={(value) => setMethod(value as IntegrationMethod)}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this integration..."
              rows={3}
            />
          </div>
        </TabsContent>

        <TabsContent value="log" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Integration Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Endpoint Logs" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Log Source</Label>
            <Select value={source} onValueChange={(value) => setSource(value as IntegrationSource)}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="endpoint">Endpoint</SelectItem>
                <SelectItem value="firewall">Firewall</SelectItem>
                <SelectItem value="waf">WAF</SelectItem>
                <SelectItem value="siem">SIEM</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Integration Method</Label>
            <Select value={method} onValueChange={(value) => setMethod(value as IntegrationMethod)}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="syslog">Syslog</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this integration..."
              rows={3}
            />
          </div>

          {method === "agent" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                After saving, you will receive an agent installation script to deploy on your systems.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Credentials</Label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddCredential}>
            <Plus className="h-4 w-4 mr-2" />
            Add Credential
          </Button>
        </div>

        {credentials.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No credentials added yet</div>
        ) : (
          <div className="space-y-4">
            {credentials.map((cred, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`cred-key-${index}`} className="text-xs">
                      Key
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5">
                            <HelpCircle className="h-3 w-3" />
                            <span className="sr-only">Help</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Environment variable name</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id={`cred-key-${index}`}
                    value={cred.key}
                    onChange={(e) => handleCredentialChange(index, "key", e.target.value)}
                    placeholder="API_KEY"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`cred-value-${index}`} className="text-xs">
                      Value
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => handleCredentialChange(index, "isSecret", !cred.isSecret)}
                    >
                      {cred.isSecret ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      <span className="sr-only">{cred.isSecret ? "Mark as not secret" : "Mark as secret"}</span>
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id={`cred-value-${index}`}
                      type={cred.isSecret && !showSecrets[index] ? "password" : "text"}
                      value={cred.value}
                      onChange={(e) => handleCredentialChange(index, "value", e.target.value)}
                      placeholder="your-api-key"
                    />
                    {cred.isSecret && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => toggleShowSecret(index)}
                      >
                        {showSecrets[index] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showSecrets[index] ? "Hide" : "Show"}</span>
                      </Button>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-6"
                  onClick={() => handleRemoveCredential(index)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remove</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {method === "agent" && activeTab === "log" && (
        <div className="space-y-2 border rounded-md p-4 bg-muted/50">
          <h3 className="font-medium">Agent Installation</h3>
          <p className="text-sm text-muted-foreground">
            After saving this integration, you will receive an agent installation script. Run this script on the systems
            you want to collect logs from.
          </p>
          <pre className="bg-background p-2 rounded-md text-xs overflow-x-auto">
            <code>curl -sSL https://example.com/install-agent.sh | sudo bash -s -- --key YOUR_AGENT_KEY</code>
          </pre>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : integration ? "Update Integration" : "Add Integration"}
        </Button>
      </div>
    </form>
  )
}
