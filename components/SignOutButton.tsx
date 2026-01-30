"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-2"
    >
      <span className="material-symbols-outlined text-lg">logout</span>
      Sign Out
    </Button>
  )
}
