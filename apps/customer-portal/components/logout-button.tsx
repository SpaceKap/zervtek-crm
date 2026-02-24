"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <Button
      variant="outline"
      size="default"
      className="min-h-[44px] sm:min-h-0"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      <LogOut className="mr-2 size-4" />
      Log out
    </Button>
  );
}
