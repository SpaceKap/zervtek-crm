"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SignOutButton({ className }: { className?: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={cn("flex items-center gap-2", className)}
    >
      <span className="material-symbols-outlined text-lg">logout</span>
      Sign Out
    </Button>
  )
}
