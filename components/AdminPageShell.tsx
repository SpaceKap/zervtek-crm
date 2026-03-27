"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";
import { cn } from "@/lib/utils";

type AdminPageShellProps = {
  icon: string;
  title: string;
  children: ReactNode;
  /** Subpages: show back to admin hub on PWA */
  backHref?: string;
};

export function AdminPageShell({
  icon,
  title,
  children,
  backHref,
}: AdminPageShellProps) {
  const isPwa = useStandalonePwa();

  return (
    <div
      className={cn(
        "space-y-6",
        isPwa && "space-y-4",
      )}
    >
      <div
        className={cn(
          "flex gap-3 min-w-0",
          isPwa ? "flex-col items-stretch gap-3" : "items-center",
        )}
      >
        {backHref && isPwa && (
          <Link href={backHref} className="self-start">
            <Button variant="ghost" size="sm" className="-ml-2 gap-1 px-2">
              <span className="material-symbols-outlined text-lg">
                arrow_back
              </span>
              Admin
            </Button>
          </Link>
        )}
        <div
          className={cn(
            "flex gap-3 min-w-0",
            isPwa ? "items-start" : "items-center",
          )}
        >
          <div
            className={cn(
              "shrink-0 rounded-lg bg-primary/10 dark:bg-[#D4AF37]/20",
              isPwa ? "p-2" : "p-2.5",
            )}
          >
            <span
              className={cn(
                "material-symbols-outlined text-primary dark:text-[#D4AF37]",
                isPwa ? "text-2xl" : "text-3xl",
              )}
            >
              {icon}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                "font-bold text-gray-900 dark:text-white pwa-title break-words",
                !isPwa && "text-3xl",
              )}
            >
              {title}
            </h1>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

/** Grid wrapper for admin hub link cards — tighter gaps in PWA */
export function AdminHubGrid({ children }: { children: ReactNode }) {
  const isPwa = useStandalonePwa();
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        isPwa ? "gap-3" : "gap-4",
      )}
    >
      {children}
    </div>
  );
}
