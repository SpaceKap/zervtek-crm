"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface NotesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inquiryId: string
  currentNotes?: string
  onSuccess?: () => void
}

export function NotesDialog({
  open,
  onOpenChange,
  inquiryId,
  currentNotes = "",
  onSuccess,
}: NotesDialogProps) {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset, setValue } = useForm<{ notes: string }>({
    defaultValues: {
      notes: currentNotes,
    },
  })

  // Only initialize form when dialog opens; avoid overwriting user input during parent re-fetch (e.g. 30s refresh)
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open) {
      if (!wasOpen.current) {
        setValue("notes", currentNotes)
        wasOpen.current = true
      }
    } else {
      wasOpen.current = false
    }
  }, [open, currentNotes, setValue])

  const onSubmit = async (data: { notes: string }) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/inquiries/${inquiryId}/notes`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes: data.notes }),
      })

      if (response.ok) {
        onSuccess?.()
        onOpenChange(false)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save notes")
      }
    } catch (error) {
      console.error("Error saving notes:", error)
      alert("Failed to save notes")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="material-symbols-outlined text-xl text-primary">
              note
            </span>
            Notes
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Add or edit notes for this inquiry. These are visible to your team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
          <div className="px-6 py-4 space-y-2">
            <Label htmlFor="inquiry-notes" className="text-sm font-medium">
              Notes
            </Label>
            <Textarea
              id="inquiry-notes"
              {...register("notes")}
              placeholder="Add notes visible to your team…"
              rows={6}
              className="resize-y min-h-[140px] max-h-[40vh]"
            />
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/30 rounded-b-lg gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save Notes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
