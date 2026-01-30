"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface ReleaseInquiryButtonProps {
  inquiryId: string
}

export function ReleaseInquiryButton({ inquiryId }: ReleaseInquiryButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleRelease = async () => {
    if (!confirm("Are you sure you want to release this inquiry back to the pool?")) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/inquiries/${inquiryId}/release`, {
        method: "POST",
      })

      if (response.ok) {
        router.push("/dashboard")
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to release inquiry")
      }
    } catch (error) {
      console.error("Error releasing inquiry:", error)
      alert("Failed to release inquiry")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleRelease}
      disabled={loading}
      className="flex items-center gap-2"
    >
      <span className="material-symbols-outlined text-lg">person_remove</span>
      {loading ? "Releasing..." : "Release to Pool"}
    </Button>
  )
}
