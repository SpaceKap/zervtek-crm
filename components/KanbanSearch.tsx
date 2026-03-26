"use client";

import { useState } from "react";
import { usePipelineSearch } from "@/components/PipelineSearchContext";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";
import { cn } from "@/lib/utils";

export function KanbanSearch() {
  const ctx = usePipelineSearch();
  const isPwa = useStandalonePwa();
  const [open, setOpen] = useState(false);
  const searchQuery = ctx?.searchQuery ?? "";
  const setSearchQuery = ctx?.setSearchQuery ?? (() => {});

  if (isPwa) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
              searchQuery
                ? "bg-primary/15 text-primary dark:bg-[#D4AF37]/15 dark:text-[#D4AF37]"
                : "text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-[#2C2C2C]",
            )}
            aria-label={
              searchQuery
                ? `Search pipeline (${searchQuery.length} characters)`
                : "Search pipeline"
            }
          >
            <span className="material-symbols-outlined text-[22px]">search</span>
            {searchQuery ? (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary dark:bg-[#D4AF37]" />
            ) : null}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(calc(100vw-2rem),22rem)] p-3"
          align="start"
          sideOffset={8}
        >
          <p className="mb-2 text-xs text-muted-foreground">
            Name, email, country — use &quot;/&quot; or &quot;|&quot; for OR
          </p>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
              search
            </span>
            <Input
              type="search"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 bg-background pl-9 pr-9"
              autoFocus
              aria-label="Search inquiries by name, email, phone, message, country, or looking for"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="relative flex min-w-[200px] max-w-[280px] items-center">
      <span className="material-symbols-outlined pointer-events-none absolute left-3 text-lg text-muted-foreground">
        search
      </span>
      <Input
        type="search"
        placeholder="Search name, email, country…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-10 bg-background pl-9"
        aria-label="Search inquiries by name, email, phone, message, country, or looking for. Use slash or pipe for OR, e.g. United States / Canada"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => setSearchQuery("")}
          className="absolute right-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Clear search"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      )}
    </div>
  );
}
