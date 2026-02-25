"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ProfileMenu } from "@/components/ProfileMenu";

type PortalHeaderProps = {
  title: string;
  subtitle?: string;
  /** Optional back link: { href, label } */
  backLink?: { href: string; label: string };
  /** Show "My profile" + Logout (authenticated dashboard) */
  showProfileAndLogout?: boolean;
  /** Optional right-side badge (e.g. vehicle count) - node */
  badge?: React.ReactNode;
};

export function PortalHeader({
  title,
  subtitle,
  backLink,
  showProfileAndLogout,
  badge,
}: PortalHeaderProps) {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            {backLink && (
              <Link
                href={backLink.href}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "default" }),
                  "inline-flex min-h-[44px] items-center gap-2 sm:min-h-0"
                )}
              >
                <ArrowLeft className="size-4 shrink-0" />
                {backLink.label}
              </Link>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {badge}
            {showProfileAndLogout && <ProfileMenu />}
          </div>
        </div>
      </div>
    </header>
  );
}
