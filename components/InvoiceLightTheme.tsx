"use client";

import { useEffect, useRef } from "react";

/**
 * Forces light theme on the public invoice page so the shared invoice
 * always renders in light mode regardless of system or saved preference.
 * Restores the previous theme when the user leaves the page.
 */
export function InvoiceLightTheme({ children }: { children: React.ReactNode }) {
  const previousDarkRef = useRef<boolean | null>(null);

  useEffect(() => {
    previousDarkRef.current = document.documentElement.classList.contains("dark");
    document.documentElement.classList.remove("dark");
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) favicon.href = "/favicon-light.svg";

    return () => {
      if (previousDarkRef.current === true) {
        document.documentElement.classList.add("dark");
        if (favicon) favicon.href = "/favicon-dark.svg";
      }
    };
  }, []);

  return <>{children}</>;
}
