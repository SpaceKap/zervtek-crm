"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
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

  useEffect(() => {
    if (open) {
      setValue("notes", currentNotes)
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">note</span>
            Notes
          </DialogTitle>
          <DialogDescription>
            Add or edit notes for this inquiry
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Textarea
              {...register("notes")}
              placeholder="Add your notes here..."
              rows={8}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Notes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
