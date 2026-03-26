"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AssignmentNotificationItem } from "@/lib/assignment-notification-types";
import {
  acknowledgeAssignmentsSeen,
  hasUnseenAssignmentNotifications,
  useAssignmentNotificationsLastAckMs,
  useAssignmentReadKeys,
} from "@/lib/assignment-notifications-client";
import { AssignmentNotificationEntries } from "@/components/AssignmentNotificationEntries";

const POLL_MS = 30_000;

/** Google Material Symbols Outlined — "notifications" (fonts.google.com/icons) */
const NOTIFICATIONS_ICON_STYLE = {
  fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
} as const;

interface AssignmentNotificationCenterProps {
  triggerClassName?: string;
}

export function AssignmentNotificationCenter({
  triggerClassName,
}: AssignmentNotificationCenterProps = {}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<AssignmentNotificationItem[]>([]);
  const lastAckAssignedMs = useAssignmentNotificationsLastAckMs();
  const { isRead, markRead, markAllRead } = useAssignmentReadKeys();

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch("/api/inquiries/notifications/assignments", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        assignments?: AssignmentNotificationItem[];
      };
      setItems(data.assignments ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
    const t = setInterval(fetchAssignments, POLL_MS);
    return () => clearInterval(t);
  }, [fetchAssignments]);

  useEffect(() => {
    if (open) fetchAssignments();
  }, [open, fetchAssignments]);

  /** Opening the panel (with loaded rows) clears the red dot for everything currently shown. */
  useEffect(() => {
    if (!open || items.length === 0) return;
    acknowledgeAssignmentsSeen(items);
  }, [open, items]);

  const unreadCount = useMemo(
    () => items.filter((a) => !isRead(a)).length,
    [items, isRead]
  );

  const hasUnseenNotifications = useMemo(
    () => hasUnseenAssignmentNotifications(items, lastAckAssignedMs),
    [items, lastAckAssignedMs]
  );

  const filtered = useMemo(() => {
    if (tab === "unread") return items.filter((a) => !isRead(a));
    return items;
  }, [items, tab, isRead]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-10 w-10 shrink-0 rounded-lg",
            triggerClassName,
          )}
          aria-label={
            hasUnseenNotifications ? "Notifications (new)" : "Notifications"
          }
        >
          <span
            className="material-symbols-outlined text-[24px] leading-none text-gray-600 dark:text-[#A1A1A1]"
            style={NOTIFICATIONS_ICON_STYLE}
            aria-hidden
          >
            notifications
          </span>
          {hasUnseenNotifications && (
            <span
              className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#1E1E1E]"
              aria-hidden
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(100vw-2rem,22rem)] sm:w-96 p-0 border border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#1E1E1E] shadow-lg"
        sideOffset={8}
      >
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-[#2C2C2C] px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Notifications
          </h2>
          <button
            type="button"
            onClick={() => markAllRead(items)}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-40"
            disabled={items.length === 0 || unreadCount === 0}
          >
            Mark all as read
          </button>
        </div>

        <div className="px-3 pt-3 pb-2">
          <div className="flex rounded-full bg-gray-100 dark:bg-[#2C2C2C] p-1">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={cn(
                "flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors",
                tab === "all"
                  ? "bg-white dark:bg-[#3C3C3C] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-[#A1A1A1]"
              )}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => setTab("unread")}
              className={cn(
                "flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors",
                tab === "unread"
                  ? "bg-white dark:bg-[#3C3C3C] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-[#A1A1A1]"
              )}
            >
              UNREAD
            </button>
          </div>
        </div>

        <div className="max-h-[min(60vh,20rem)] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-[#A1A1A1]">
              {tab === "unread"
                ? "No unread notifications"
                : "No assignment notifications yet"}
            </p>
          ) : (
            <AssignmentNotificationEntries
              items={filtered}
              isRead={isRead}
              markRead={markRead}
              variant="compact"
              onNavigate={() => setOpen(false)}
            />
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-[#2C2C2C] px-4 py-3 text-center">
          <Link
            href="/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="text-sm font-medium text-primary hover:underline"
          >
            See all
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
