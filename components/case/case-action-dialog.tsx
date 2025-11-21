"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangleIcon, UserIcon, SaveIcon, XIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CaseActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  case: any
  onUpdate: () => void
}

interface CaseUpdate {
  status?: string
  assignee?: string
  severity?: string
  comment?: string
}

const ASSIGNEES = [
  { id: "unassigned", name: "Unassigned" },
  { id: "abimantara", name: "Abdi Bimantara" },
  { id: "ahafiz", name: "Habib" },
  { id: "ambarfitri", name: "Ambar" },
  { id: "araffly", name: "Rafly Cireng" },
  { id: "ariful", name: "Ariful" },
  { id: "asap", name: "Asap" },
  { id: "azamzami", name: "Ahmad Zaid Zam Zami" },
  { id: "bimarizki", name: "Bima" },
  { id: "fannisa", name: "Jawir" },
  { id: "fazzahrah", name: "Farah" },
  { id: "ffadhillah", name: "Fikri" },
  { id: "fnurelia", name: "Firda" },
  { id: "gandarizky", name: "Ganda" },
  { id: "haikalrahman", name: "Haikal" },
  { id: "hnurjannah", name: "Habil dan Qabil" },
  { id: "mtaufik", name: "Taufik" },
  { id: "radhitia", name: "Raihan" },
  { id: "shizbullah", name: "Said Bajaj Bajuri" },
]

const STATUSES = [
  { value: "Open", label: "Open", color: "destructive" },
  { value: "In Progress", label: "In Progress", color: "default" },
  { value: "Resolved", label: "Resolved", color: "secondary" },
  { value: "Closed", label: "Closed", color: "outline" },
  { value: "Cancelled", label: "Cancelled", color: "outline" },
]

const SEVERITIES = [
  { value: "Critical", label: "Critical", color: "destructive" },
  { value: "High", label: "High", color: "destructive" },
  { value: "Medium", label: "Medium", color: "default" },
  { value: "Low", label: "Low", color: "secondary" },
]

export function CaseActionDialog({ open, onOpenChange, case: caseData, onUpdate }: CaseActionDialogProps) {
  const [updates, setUpdates] = useState<CaseUpdate>({})
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && caseData) {
      // Reset form when dialog opens
      setUpdates({})
      setComment("")
    }
  }, [open, caseData])

  const handleUpdate = async () => {
    if (!caseData) return

    // Check if there are any changes
    const hasChanges = Object.keys(updates).length > 0 || comment.trim()

    if (!hasChanges) {
      toast({
        title: "No Changes",
        description: "Please make at least one change before updating.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const updateData = {
        ...updates,
        comment: comment.trim() || undefined,
      }

      const response = await fetch(`/api/cases/${caseData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Case Updated",
          description: "The case has been successfully updated.",
        })
        onUpdate()
        onOpenChange(false)
      } else {
        toast({
          title: "Update Failed",
          description: data.error || "Failed to update case",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating case:", error)
      toast({
        title: "Update Failed",
        description: "An error occurred while updating the case",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getChangeSummary = () => {
    const changes: string[] = []

    if (updates.status && updates.status !== caseData?.status) {
      changes.push(`Status: ${caseData?.status} ? ${updates.status}`)
    }

    if (updates.assignee && updates.assignee !== caseData?.assignee) {
      const oldAssignee = ASSIGNEES.find((a) => a.id === caseData?.assignee)?.name || "Unassigned"
      const newAssignee = ASSIGNEES.find((a) => a.id === updates.assignee)?.name || "Unassigned"
      changes.push(`Assignee: ${oldAssignee} ? ${newAssignee}`)
    }

    if (updates.severity && updates.severity !== caseData?.severity) {
      changes.push(`Severity: ${caseData?.severity} ? ${updates.severity}`)
    }

    return changes
  }

  const getSeverityColor = (severity: string) => {
    const severityObj = SEVERITIES.find((s) => s.value === severity)
    return severityObj?.color || "outline"
  }

  const getStatusColor = (status: string) => {
    const statusObj = STATUSES.find((s) => s.value === status)
    return statusObj?.color || "outline"
  }

  if (!caseData) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5" />
            Update Case
            <Badge variant="outline" className="ml-2">
              #{caseData.ticketId}
            </Badge>
          </DialogTitle>
          <DialogDescription>Make changes to the case and add comments</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Case Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Case Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant={getStatusColor(caseData.status)} className="mt-1">
                    {caseData.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Severity</Label>
                  <Badge variant={getSeverityColor(caseData.severity)} className="mt-1">
                    {caseData.severity}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Assignee</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{caseData.assigneeName || caseData.assignee || "Unassigned"}</span>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Case Name</Label>
                <p className="text-sm mt-1">{caseData.name}</p>
              </div>
            </CardContent>
          </Card>

          {/* Update Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={updates.status || ""}
                  onValueChange={(value) => setUpdates({ ...updates, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select
                  value={updates.severity || ""}
                  onValueChange={(value) => setUpdates({ ...updates, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((severity) => (
                      <SelectItem key={severity.value} value={severity.value}>
                        {severity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Select
                  value={updates.assignee || ""}
                  onValueChange={(value) => setUpdates({ ...updates, assignee: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNEES.map((assignee) => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        {assignee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                placeholder="Add a comment about this update..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Changes Summary */}
          {getChangeSummary().length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Changes Summary</CardTitle>
                <CardDescription>The following changes will be applied</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getChangeSummary().map((change, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">{change}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            <XIcon className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={loading}>
            <SaveIcon className="h-4 w-4 mr-2" />
            {loading ? "Updating..." : "Update Case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
