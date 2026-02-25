"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { User, Wallet, LogOut } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProfileMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 min-h-[44px] min-w-[44px] rounded-full sm:size-9 sm:min-h-0 sm:min-w-0"
          aria-label="Open profile menu"
        >
          <User className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 border bg-card p-2 text-card-foreground shadow-lg">
        <div className="flex flex-col gap-0.5">
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <User className="size-4 shrink-0" />
            My profile
          </Link>
          <Link
            href="/profile/wallet"
            className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <Wallet className="size-4 shrink-0" />
            Wallet
          </Link>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <LogOut className="size-4 shrink-0" />
            Log out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
