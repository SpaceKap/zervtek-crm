"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

interface NotificationCenterProps {
  user: {
    id?: string | null;
    role?: string | null;
  };
}

const POLL_MS = 30_000;

function canUseNotificationCenter(role: string | undefined): boolean {
  const r = role as UserRole | undefined;
  return (
    r === UserRole.MANAGER ||
    r === UserRole.ADMIN ||
    r === UserRole.SALES ||
    r === UserRole.BACK_OFFICE_STAFF
  );
}

function avatarLetter(title: string): string {
  const t = title.trim();
  if (!t) return "?";
  return t.charAt(0).toUpperCase();
}

export function NotificationCenter({ user }: NotificationCenterProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const enabled = Boolean(user.id) && canUseNotificationCenter(user.role ?? undefined);

  const load = useCallback(async () => {
    if (!user.id || !enabled) return;
    setLoading(true);
    try {
      const unreadOnly = tab === "unread" ? "1" : "0";
      const res = await fetch(`/api/notifications?limit=30&unreadOnly=${unreadOnly}`, {
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
  }, [user.id, enabled, tab]);

  useEffect(() => {
    if (!enabled) return;
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [enabled, load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ markAllRead: true }),
    });
    await load();
  };

  const onRowActivate = async (n: NotificationRow) => {
    if (!n.readAt) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: [n.id] }),
      });
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  if (!enabled) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative h-9 w-9 shrink-0 rounded-lg border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#1E1E1E]"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-xl text-gray-700 dark:text-gray-200">
            notifications
          </span>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#1E1E1E]" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(100vw-2rem,22rem)] p-0 overflow-hidden rounded-xl border border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#1E1E1E] shadow-lg"
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100 dark:border-[#2C2C2C]">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</span>
          <button
            type="button"
            onClick={() => markAllRead()}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-40"
            disabled={unreadCount === 0}
          >
            Mark all as read
          </button>
        </div>

        <div className="flex gap-1 p-2">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "flex-1 rounded-md py-1.5 text-xs font-semibold tracking-wide transition-colors",
              tab === "all"
                ? "bg-gray-100 dark:bg-[#2C2C2C] text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-[#A1A1A1] hover:bg-gray-50 dark:hover:bg-[#252525]"
            )}
          >
            ALL
          </button>
          <button
            type="button"
            onClick={() => setTab("unread")}
            className={cn(
              "flex-1 rounded-md py-1.5 text-xs font-semibold tracking-wide transition-colors",
              tab === "unread"
                ? "bg-gray-100 dark:bg-[#2C2C2C] text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-[#A1A1A1] hover:bg-gray-50 dark:hover:bg-[#252525]"
            )}
          >
            UNREAD
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto border-t border-gray-100 dark:border-[#2C2C2C]">
          {loading && notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-[#A1A1A1]">
              No notifications
            </p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n.id} className="border-b border-gray-100 dark:border-[#2C2C2C] last:border-0">
                  <button
                    type="button"
                    onClick={() => onRowActivate(n)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-[#252525]",
                      !n.readAt && "bg-primary/[0.04] dark:bg-primary/10"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        "bg-gray-200 dark:bg-[#2C2C2C] text-gray-700 dark:text-gray-200"
                      )}
                      aria-hidden
                    >
                      {avatarLetter(n.title)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-[#A1A1A1] line-clamp-2 mt-0.5">
                        {n.body}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-lg text-gray-400 shrink-0 mt-1">
                      arrow_forward
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-[#2C2C2C] py-2.5 text-center">
          <Link
            href="/dashboard/notifications"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            See all
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
