"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { AssignmentNotificationItem } from "@/lib/assignment-notification-types";
import { assignmentDetailText, assignmentKey } from "@/lib/assignment-notifications-client";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

type Props = {
  items: AssignmentNotificationItem[];
  isRead: (a: AssignmentNotificationItem) => boolean;
  markRead: (a: AssignmentNotificationItem) => void;
  variant: "compact" | "full";
  onNavigate?: () => void;
};

/** Links to inquiry detail: /dashboard/inquiries/[id] */
export function AssignmentNotificationEntries({
  items,
  isRead,
  markRead,
  variant,
  onNavigate,
}: Props) {
  const compact = variant === "compact";

  return (
    <ul
      className={cn(
        !compact && "space-y-3",
        compact && "divide-y divide-gray-100 dark:divide-[#2C2C2C]"
      )}
    >
      {items.map((a) => {
        const read = isRead(a);
        const href = `/dashboard/inquiries/${a.id}`;
        return (
          <li
            key={assignmentKey(a.id, a.assignedAt)}
            className={cn(!compact && "list-none")}
          >
            <Link
              href={href}
              onClick={() => {
                markRead(a);
                onNavigate?.();
              }}
              className={cn(
                "flex gap-3 rounded-lg border border-transparent transition-colors",
                compact
                  ? cn(
                      "items-start px-4 py-3",
                      "hover:bg-gray-50 dark:hover:bg-[#2C2C2C]",
                      !read && "bg-primary/[0.04] dark:bg-primary/10"
                    )
                  : cn(
                      "items-start p-4 border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#1E1E1E]",
                      "hover:border-primary/30 hover:bg-gray-50/80 dark:hover:bg-[#252525]",
                      !read && "border-primary/20 bg-primary/[0.03] dark:bg-primary/10"
                    )
              )}
            >
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary dark:bg-primary/20 dark:text-[#D4AF37]",
                  compact ? "h-10 w-10" : "h-12 w-12 text-sm"
                )}
                aria-hidden
              >
                {getInitials(a.customerName)}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-semibold text-gray-900 dark:text-white truncate",
                    compact ? "text-sm" : "text-base"
                  )}
                >
                  {a.customerName}
                </p>
                {a.country && (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-[#A1A1A1]">
                    {a.country}
                  </p>
                )}
                {compact ? (
                  <p className="mt-0.5 text-xs leading-snug text-gray-600 dark:text-[#A1A1A1] line-clamp-2">
                    {assignmentDetailText(a.message, a.lookingFor)} has been
                    assigned to you.
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-[#CFCFCF] line-clamp-4 whitespace-pre-wrap break-words">
                    {assignmentDetailText(a.message, a.lookingFor)}
                  </p>
                )}
                {!compact && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-[#A1A1A1]">
                    Assigned to you{" "}
                    {formatDistanceToNow(new Date(a.assignedAt), {
                      addSuffix: true,
                    })}
                  </p>
                )}
                {compact && (
                  <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                    {formatDistanceToNow(new Date(a.assignedAt), {
                      addSuffix: true,
                    })}
                  </p>
                )}
              </div>
              <span className="material-symbols-outlined shrink-0 text-lg text-gray-400 mt-1">
                chevron_right
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
