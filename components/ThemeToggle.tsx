"use client";

import { useState, useEffect } from "react";
import { useTheme } from "./ThemeProvider";
import { Button } from "./ui/button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Always render the same structure, just change the icon after mount
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-9 h-9 p-0"
      aria-label="Toggle theme"
    >
      {!mounted ? (
        // Render dark_mode during SSR and initial render to match server
        <span className="material-symbols-outlined text-lg">dark_mode</span>
      ) : theme === "light" ? (
        <span className="material-symbols-outlined text-lg">dark_mode</span>
      ) : (
        <span className="material-symbols-outlined text-lg">light_mode</span>
      )}
    </Button>
  );
}
