"use client"

import { useTheme } from "./ThemeProvider"
import { Button } from "./ui/button"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-9 h-9 p-0"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <span className="material-symbols-outlined text-lg">dark_mode</span>
      ) : (
        <span className="material-symbols-outlined text-lg">light_mode</span>
      )}
    </Button>
  )
}
