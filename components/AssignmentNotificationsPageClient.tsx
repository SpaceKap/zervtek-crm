"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AssignmentNotificationItem } from "@/lib/assignment-notification-types";
import {
  acknowledgeAssignmentsSeen,
  useAssignmentReadKeys,
} from "@/lib/assignment-notifications-client";
import { AssignmentNotificationEntries } from "@/components/AssignmentNotificationEntries";

const POLL_MS = 45_000;
const LIST_LIMIT = 100;

export function AssignmentNotificationsPageClient() {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<AssignmentNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isRead, markRead, markAllRead } = useAssignmentReadKeys();

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/inquiries/notifications/assignments?limit=${LIST_LIMIT}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = (await res.json()) as {
        assignments?: AssignmentNotificationItem[];
      };
      setItems(data.assignments ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
    const t = setInterval(fetchAssignments, POLL_MS);
    return () => clearInterval(t);
  }, [fetchAssignments]);

  /** Visiting this page counts as having seen all listed assignments (red dot). */
  useEffect(() => {
    if (items.length === 0) return;
    acknowledgeAssignmentsSeen(items);
  }, [items]);

  const unreadCount = useMemo(
    () => items.filter((a) => !isRead(a)).length,
    [items, isRead]
  );

  const filtered = useMemo(() => {
    if (tab === "unread") return items.filter((a) => !isRead(a));
    return items;
  }, [items, tab, isRead]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 dark:border-[#2C2C2C] dark:bg-[#1E1E1E] dark:text-[#A1A1A1] dark:hover:bg-[#2C2C2C]"
            aria-label="Back to dashboard"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
              Assignment notifications
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-[#A1A1A1]">
              Leads assigned to you — open a row for full inquiry details.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              fetchAssignments();
            }}
            disabled={loading}
          >
            <span className="material-symbols-outlined mr-1 text-base">refresh</span>
            Refresh
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => markAllRead(items)}
            disabled={items.length === 0 || unreadCount === 0}
          >
            Mark all as read
          </Button>
        </div>
      </div>

      <div className="mb-4 flex rounded-full bg-gray-100 p-1 dark:bg-[#2C2C2C] sm:max-w-md">
        <button
          type="button"
          onClick={() => setTab("all")}
          className={cn(
            "flex-1 rounded-full py-2 text-xs font-semibold transition-colors sm:text-sm",
            tab === "all"
              ? "bg-white text-gray-900 shadow-sm dark:bg-[#3C3C3C] dark:text-white"
              : "text-gray-500 dark:text-[#A1A1A1]"
          )}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setTab("unread")}
          className={cn(
            "flex-1 rounded-full py-2 text-xs font-semibold transition-colors sm:text-sm",
            tab === "unread"
              ? "bg-white text-gray-900 shadow-sm dark:bg-[#3C3C3C] dark:text-white"
              : "text-gray-500 dark:text-[#A1A1A1]"
          )}
        >
          Unread
          {unreadCount > 0 ? ` (${unreadCount})` : ""}
        </button>
      </div>

      {loading && items.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500 dark:text-[#A1A1A1]">
          Loading…
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500 dark:border-[#2C2C2C] dark:text-[#A1A1A1]">
          {tab === "unread"
            ? "No unread assignment notifications."
            : "No inquiries are currently assigned to you."}
        </p>
      ) : (
        <AssignmentNotificationEntries
          items={filtered}
          isRead={isRead}
          markRead={markRead}
          variant="full"
        />
      )}
    </div>
  );
}
