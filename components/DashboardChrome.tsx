"use client";

import { DashboardNav } from "@/components/DashboardNav";
import { InquiryNotificationPoller } from "@/components/InquiryNotificationPoller";
import { PwaClientExperience } from "@/components/PwaClientExperience";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";
import { cn } from "@/lib/utils";

interface DashboardChromeProps {
  user: { name?: string | null; email?: string | null; role?: string };
  children: React.ReactNode;
}

/**
 * PWA: full viewport column layout so pages (e.g. Kanban) can flex to the bottom
 * including safe-area insets.
 */
export function DashboardChrome({ user, children }: DashboardChromeProps) {
  const isPwa = useStandalonePwa();

  return (
    <div
      className={cn(
        "bg-gray-50 dark:bg-[#121212]",
        isPwa
          ? "flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]"
          : "min-h-screen",
      )}
    >
      <DashboardNav user={user} />
      <InquiryNotificationPoller user={user} />
      <PwaClientExperience userRole={user.role} />
      <main
        className={cn(
          "w-full bg-gray-50 px-4 py-4 dark:bg-[#121212] sm:px-6 sm:py-6",
          isPwa ? "flex min-h-0 flex-1 flex-col" : "",
        )}
      >
        {children}
      </main>
    </div>
  );
}
