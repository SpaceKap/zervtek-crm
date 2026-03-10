"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  playNotificationSound,
  unlockAudio,
} from "@/lib/notification-sound";
import { UserRole } from "@prisma/client";

const POLL_INTERVAL_MS = 12_000;

interface InquiryNotificationPollerProps {
  user: {
    id?: string | null;
    role?: string | null;
    name?: string | null;
    email?: string | null;
  };
}

export function InquiryNotificationPoller({ user }: InquiryNotificationPollerProps) {
  const sinceRef = useRef<string>(new Date().toISOString());
  const lastSeenNewIdsRef = useRef<Set<string>>(new Set());
  const lastSeenAssignedIdsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);
  const audioUnlockedRef = useRef(false);

  const role = (user?.role as UserRole) ?? undefined;
  const isManager = role === UserRole.MANAGER || role === UserRole.ADMIN;
  const isSales = role === UserRole.SALES;
  const isBackOffice = role === UserRole.BACK_OFFICE_STAFF;
  const canReceive =
    isManager || isSales || isBackOffice;

  const poll = useCallback(async () => {
    if (!canReceive || !mountedRef.current) return;
    try {
      const res = await fetch(
        `/api/inquiries/notifications?since=${encodeURIComponent(sinceRef.current)}`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const data = await res.json();
      const {
        newInquiryIds = [],
        assignedToMeIds = [],
        at,
      } = data as {
        newInquiryIds?: string[];
        assignedToMeIds?: string[];
        at?: string;
      };
      if (at) sinceRef.current = at;

      const title = "Inquiry Pooler";
      const playAndNotify = (message: string, id: string) => {
        playNotificationSound();
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          try {
            const n = new Notification(title, {
              body: message,
              tag: `inquiry-${id}`,
              requireInteraction: false,
            });
            n.onclick = () => {
              window.focus();
              n.close();
            };
          } catch {
            // Ignore
          }
        }
      };

      if (isManager) {
        for (const id of newInquiryIds) {
          if (lastSeenNewIdsRef.current.has(id)) continue;
          lastSeenNewIdsRef.current.add(id);
          playAndNotify("New lead received", id);
        }
      }

      for (const id of assignedToMeIds) {
        if (lastSeenAssignedIdsRef.current.has(id)) continue;
        lastSeenAssignedIdsRef.current.add(id);
        playAndNotify("A lead has been assigned to you", id);
      }
    } catch {
      // Ignore network errors
    }
  }, [canReceive, isManager, role]);

  useEffect(() => {
    mountedRef.current = true;
    if (!canReceive) return;

    const requestPermission = () => {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    };
    requestPermission();

    const unlockOnInteraction = () => {
      if (audioUnlockedRef.current) return;
      audioUnlockedRef.current = true;
      unlockAudio();
      document.removeEventListener("click", unlockOnInteraction);
      document.removeEventListener("keydown", unlockOnInteraction);
    };
    document.addEventListener("click", unlockOnInteraction, { once: true });
    document.addEventListener("keydown", unlockOnInteraction, { once: true });

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [canReceive, poll]);

  return null;
}
