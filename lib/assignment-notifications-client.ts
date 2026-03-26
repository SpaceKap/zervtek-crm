"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { AssignmentNotificationItem } from "@/lib/assignment-notification-types";

export const STORAGE_READ_KEYS = "inquiry-pooler:assignment-read-keys";
export const STORAGE_LAST_ACK = "inquiry-pooler:assignment-panel-last-ack-assigned-at";
export const ASSIGNMENT_ACK_EVENT = "inquiry-pooler-assignment-ack";
export const READ_KEYS_EVENT = "inquiry-pooler-read-keys-changed";

const MAX_READ_KEYS = 400;

export function assignmentKey(id: string, assignedAt: string): string {
  return `${id}:${new Date(assignedAt).getTime()}`;
}

export function loadReadKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_READ_KEYS);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function saveReadKeys(set: Set<string>) {
  const arr = [...set].slice(-MAX_READ_KEYS);
  localStorage.setItem(STORAGE_READ_KEYS, JSON.stringify(arr));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(READ_KEYS_EVENT));
  }
}

export function loadLastAckAssignedMs(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_LAST_ACK);
    if (!raw) return 0;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : 0;
  } catch {
    return 0;
  }
}

function saveLastAckAssignedMs(ms: number) {
  localStorage.setItem(STORAGE_LAST_ACK, new Date(ms).toISOString());
}

/**
 * Marks all given assignments as "seen" for the red dot (max assignedAt in the set).
 * Persists to localStorage and notifies this tab + other tabs (storage event).
 */
export function acknowledgeAssignmentsSeen(
  items: Pick<AssignmentNotificationItem, "assignedAt">[]
): void {
  if (typeof window === "undefined" || items.length === 0) return;
  const maxAssigned = Math.max(
    ...items.map((a) => new Date(a.assignedAt).getTime())
  );
  if (!Number.isFinite(maxAssigned)) return;
  const prev = loadLastAckAssignedMs();
  const next = Math.max(prev, maxAssigned);
  if (next > prev) {
    saveLastAckAssignedMs(next);
    window.dispatchEvent(new Event(ASSIGNMENT_ACK_EVENT));
  }
}

function subscribeToAckChanges(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_LAST_ACK || e.key === null) onStoreChange();
  };
  const onAck = () => onStoreChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(ASSIGNMENT_ACK_EVENT, onAck);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(ASSIGNMENT_ACK_EVENT, onAck);
  };
}

/** Subscribes to red-dot "last seen" timestamp (synced across tabs). */
export function useAssignmentNotificationsLastAckMs(): number {
  return useSyncExternalStore(
    subscribeToAckChanges,
    loadLastAckAssignedMs,
    () => 0
  );
}

export function hasUnseenAssignmentNotifications(
  items: Pick<AssignmentNotificationItem, "assignedAt">[],
  lastAckMs: number
): boolean {
  return items.some(
    (a) => new Date(a.assignedAt).getTime() > lastAckMs
  );
}

/** Prefer customer message; fall back to looking-for line. */
export function assignmentDetailText(
  message: string | null,
  lookingFor: string | null
): string {
  const m = message?.trim();
  if (m) return m;
  const l = lookingFor?.trim();
  if (l) return `Looking for ${l}`;
  return "This lead";
}

export function useAssignmentReadKeys() {
  const [readKeys, setReadKeys] = useState<Set<string>>(() => new Set());

  const reloadReadKeys = useCallback(() => {
    setReadKeys(loadReadKeys());
  }, []);

  useEffect(() => {
    reloadReadKeys();
    const onReadKeys = () => reloadReadKeys();
    window.addEventListener(READ_KEYS_EVENT, onReadKeys);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_READ_KEYS || e.key === null) reloadReadKeys();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(READ_KEYS_EVENT, onReadKeys);
      window.removeEventListener("storage", onStorage);
    };
  }, [reloadReadKeys]);

  const isRead = useCallback(
    (a: AssignmentNotificationItem) =>
      readKeys.has(assignmentKey(a.id, a.assignedAt)),
    [readKeys]
  );

  const markRead = useCallback((a: AssignmentNotificationItem) => {
    const k = assignmentKey(a.id, a.assignedAt);
    setReadKeys((prev) => {
      const next = new Set(prev);
      next.add(k);
      saveReadKeys(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback((items: AssignmentNotificationItem[]) => {
    setReadKeys((prev) => {
      const next = new Set(prev);
      for (const a of items) next.add(assignmentKey(a.id, a.assignedAt));
      saveReadKeys(next);
      return next;
    });
  }, []);

  return { isRead, markRead, markAllRead };
}
