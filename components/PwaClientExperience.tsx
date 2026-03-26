"use client";

import { useCallback, useEffect, useState } from "react";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PWA_NUDGE_DISMISS_KEY,
  urlBase64ToUint8Array,
} from "@/lib/pwa-client";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";

const ELIGIBLE_ROLES: UserRole[] = [
  UserRole.SALES,
  UserRole.MANAGER,
  UserRole.ADMIN,
  UserRole.BACK_OFFICE_STAFF,
];

/** Associate the browser push subscription with the current session user (upsert). */
async function savePushSubscriptionToServer(
  sub: PushSubscription,
): Promise<boolean> {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return false;
  }
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(json),
  });
  return res.ok;
}

type Phase =
  | "idle"
  | "checking"
  | "no_server_push"
  | "ready_prompt"
  | "subscribing"
  | "denied"
  | "error";

interface PwaClientExperienceProps {
  userRole: string | null | undefined;
}

export function PwaClientExperience({ userRole }: PwaClientExperienceProps) {
  const isPwaStandalone = useStandalonePwa();
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  const eligible =
    userRole != null &&
    ELIGIBLE_ROLES.includes(userRole as UserRole);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(PWA_NUDGE_DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const runCheck = useCallback(async () => {
    if (!eligible || typeof window === "undefined") {
      setPhase("idle");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPhase("no_server_push");
      return;
    }

    setPhase("checking");

    const vapidRes = await fetch("/api/push/vapid-public-key", {
      credentials: "include",
    });
    if (!vapidRes.ok) {
      setPhase("no_server_push");
      return;
    }

    const { publicKey } = (await vapidRes.json()) as { publicKey?: string };
    if (!publicKey) {
      setPhase("no_server_push");
      return;
    }

    try {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    } catch (e) {
      console.error("[PWA] service worker registration failed", e);
      setPhase("error");
      setErrorMessage("Could not enable offline notifications.");
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      try {
        const ok = await savePushSubscriptionToServer(existing);
        if (!ok) {
          console.warn(
            "[PWA] Could not sync push subscription to server (check login / VAPID).",
          );
        }
      } catch (e) {
        console.warn("[PWA] Push subscription sync failed", e);
      }
      setPhase("idle");
      return;
    }

    const perm = Notification.permission;
    if (perm === "denied") {
      setPhase("denied");
      return;
    }

    setPhase("ready_prompt");
  }, [eligible]);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  const subscribe = async () => {
    setPhase("subscribing");
    setErrorMessage(null);
    try {
      const notificationPerm = await Notification.requestPermission();
      if (notificationPerm !== "granted") {
        setPhase("denied");
        return;
      }

      const vapidRes = await fetch("/api/push/vapid-public-key", {
        credentials: "include",
      });
      if (!vapidRes.ok) throw new Error("Server not configured");
      const { publicKey } = (await vapidRes.json()) as { publicKey: string };
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const ok = await savePushSubscriptionToServer(sub);
      if (!ok) {
        throw new Error("Could not save push subscription on server");
      }
      setPhase("idle");
      setSuccessToast(true);
      window.setTimeout(() => setSuccessToast(false), 4500);
    } catch (e) {
      console.error("[PWA] subscribe", e);
      setPhase("error");
      setErrorMessage(
        e instanceof Error ? e.message : "Something went wrong. Try again."
      );
    }
  };

  const dismiss = () => {
    try {
      localStorage.setItem(PWA_NUDGE_DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  if (!eligible || dismissed) return null;

  if (phase === "idle" || phase === "checking") {
    return null;
  }

  if (phase === "no_server_push") {
    return null;
  }

  if (successToast) {
    return (
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-[45] flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6"
        aria-live="polite"
      >
        <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-emerald-200/80 bg-white/95 px-4 py-3 text-sm shadow-lg backdrop-blur-sm dark:border-emerald-900/50 dark:bg-[#1E1E1E]/95">
          <span
            className="material-symbols-outlined text-emerald-600 dark:text-emerald-400"
            aria-hidden
          >
            check_circle
          </span>
          <p className="text-gray-700 dark:text-[#CFCFCF]">
            <span className="font-medium text-gray-900 dark:text-white">
              You’re all set.
            </span>{" "}
            We’ll alert you when a lead is assigned to you.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "denied") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[45] flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
        <div className="flex max-w-lg flex-col gap-2 rounded-2xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm shadow-lg backdrop-blur-sm dark:border-amber-900/40 dark:bg-amber-950/90">
          <p className="text-amber-950 dark:text-amber-100">
            Browser notifications are blocked. To get assignment alerts, enable
            notifications for this site in your browser settings.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="self-end text-xs font-medium text-amber-900 underline dark:text-amber-200"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  if (phase === "ready_prompt" || phase === "subscribing" || phase === "error") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[45] flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
        <div
          className={cn(
            "relative w-full max-w-lg overflow-hidden rounded-2xl border shadow-xl backdrop-blur-sm",
            "border-[#003049]/15 bg-gradient-to-br from-white via-white to-slate-50/90",
            "dark:border-[#2C2C2C] dark:from-[#1E1E1E] dark:via-[#1E1E1E] dark:to-[#252525]"
          )}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#003049] via-[#fa7921] to-[#003049]" />
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#003049]/10 dark:bg-[#D4AF37]/15">
              <span
                className="material-symbols-outlined text-2xl text-[#003049] dark:text-[#D4AF37]"
                aria-hidden
              >
                install_mobile
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Stay on top of new assignments
              </h2>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-[#A1A1A1]">
                Allow notifications to get an alert when someone assigns a lead to
                you — including when CRM is closed or in the background. Same login
                and permissions as the website.
              </p>
              {phase === "error" && errorMessage && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {errorMessage}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  className={cn(
                    "rounded-full bg-[#003049] px-5 text-white hover:bg-[#004060] dark:bg-[#D4AF37] dark:text-[#1a1a1a] dark:hover:bg-[#c4a032]",
                    isPwaStandalone && "min-h-11 touch-manipulation",
                  )}
                  disabled={phase === "subscribing"}
                  onClick={() => void subscribe()}
                >
                  {phase === "subscribing" ? (
                    <>
                      <span className="material-symbols-outlined mr-2 animate-spin text-lg">
                        progress_activity
                      </span>
                      Turning on…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined mr-2 text-lg">
                        notifications
                      </span>
                      Enable alerts
                    </>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={dismiss}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-[#A1A1A1] dark:hover:text-white",
                    isPwaStandalone && "min-h-11 touch-manipulation",
                  )}
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-3 top-3 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-[#2C2C2C] dark:hover:text-white"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
