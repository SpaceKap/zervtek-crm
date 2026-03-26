"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

function avatarLetter(title: string): string {
  const t = title.trim();
  if (!t) return "?";
  return t.charAt(0).toUpperCase();
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=100&unreadOnly=0", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications?: NotificationRow[];
        unreadCount?: number;
      };
      setNotifications(data.notifications ?? []);
      if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ markAllRead: true }),
    });
    await load();
  };

  const onRowClick = async (n: NotificationRow) => {
    if (!n.readAt) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: [n.id] }),
      });
    }
    if (n.link) router.push(n.link);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-primary hover:underline mb-1 inline-block"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 dark:text-[#A1A1A1] mt-1">
              {unreadCount} unread
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={markAllRead}
          className="text-sm font-medium text-primary hover:underline disabled:opacity-40 shrink-0"
          disabled={unreadCount === 0}
        >
          Mark all as read
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#1E1E1E] overflow-hidden shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-gray-500">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="p-8 text-center text-gray-500 dark:text-[#A1A1A1]">
            No notifications yet.
          </p>
        ) : (
          <ul>
            {notifications.map((n) => (
              <li key={n.id} className="border-b border-gray-100 dark:border-[#2C2C2C] last:border-0">
                <button
                  type="button"
                  onClick={() => onRowClick(n)}
                  className={cn(
                    "flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-[#252525]",
                    !n.readAt && "bg-primary/[0.04] dark:bg-primary/10"
                  )}
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold bg-gray-200 dark:bg-[#2C2C2C] text-gray-800 dark:text-gray-200"
                    aria-hidden
                  >
                    {avatarLetter(n.title)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {n.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-[#A1A1A1] mt-1">{n.body}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {formatWhen(n.createdAt)}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400 shrink-0">chevron_right</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
