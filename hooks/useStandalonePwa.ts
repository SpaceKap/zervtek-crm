"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const mqlStandalone = window.matchMedia("(display-mode: standalone)");
  const mqlFullscreen = window.matchMedia("(display-mode: fullscreen)");
  const handler = () => onStoreChange();
  mqlStandalone.addEventListener("change", handler);
  mqlFullscreen.addEventListener("change", handler);
  return () => {
    mqlStandalone.removeEventListener("change", handler);
    mqlFullscreen.removeEventListener("change", handler);
  };
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

function getServerSnapshot(): boolean {
  return false;
}

/** True when the app runs as an installed PWA (home screen / standalone). */
export function useStandalonePwa(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
