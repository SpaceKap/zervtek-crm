"use client";

import { usePipelineSearch } from "@/components/PipelineSearchContext";
import { Input } from "@/components/ui/input";

export function KanbanSearch() {
  const ctx = usePipelineSearch();
  const searchQuery = ctx?.searchQuery ?? "";
  const setSearchQuery = ctx?.setSearchQuery ?? (() => {});

  return (
    <div className="relative flex items-center min-w-[200px] max-w-[280px]">
      <span className="material-symbols-outlined absolute left-3 text-lg text-muted-foreground pointer-events-none">
        search
      </span>
      <Input
        type="search"
        placeholder="Search inquiries..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-9 h-10 bg-background"
        aria-label="Search inquiries by name, email, or phone"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => setSearchQuery("")}
          className="absolute right-2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Clear search"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      )}
    </div>
  );
}
