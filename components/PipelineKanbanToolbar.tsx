"use client";

import { useState } from "react";
import { InquirySource } from "@prisma/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { usePipelineViewPreferences } from "@/components/PipelineSearchContext";
import {
  ALL_INQUIRY_SOURCES_SORTED,
  type PipelineGroupMode,
  type PipelineSortMode,
} from "@/lib/kanban-pipeline-view";

const SORT_OPTIONS: { value: PipelineSortMode; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name_az", label: "Name A–Z" },
  { value: "name_za", label: "Name Z–A" },
];

const GROUP_OPTIONS: { value: PipelineGroupMode; label: string }[] = [
  { value: "none", label: "None (flat list)" },
  { value: "source", label: "Source" },
  { value: "assignee", label: "Assignee" },
];

function sourceCheckboxLabel(source: InquirySource): string {
  return source
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function PipelineKanbanToolbar() {
  const view = usePipelineViewPreferences();
  const [filterOpen, setFilterOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  if (!view) return null;

  const {
    prefs,
    setSortMode,
    setGroupMode,
    setHideEmpty,
    toggleSource,
  } = view;

  const selectedSources =
    prefs.sourcesAllowlist == null
      ? new Set<InquirySource>(ALL_INQUIRY_SOURCES_SORTED)
      : prefs.sourcesAllowlist;

  const sortSummary =
    SORT_OPTIONS.find((o) => o.value === prefs.sortMode)?.label ?? "Sort";
  const groupSummary =
    GROUP_OPTIONS.find((o) => o.value === prefs.groupMode)?.label ?? "Group";

  return (
    <>
      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors",
              prefs.hideEmpty || prefs.sourcesAllowlist != null
                ? "text-primary dark:text-[#D4AF37] bg-primary/10 dark:bg-primary/15"
                : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[#2C2C2C]",
            )}
          >
            <span className="material-symbols-outlined text-lg">tune</span>
            <span>Filter</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 max-h-[min(70vh,420px)] overflow-y-auto" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Columns</h4>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="kb-hide-empty"
                  checked={prefs.hideEmpty}
                  onCheckedChange={(v) => setHideEmpty(v === true)}
                />
                <Label htmlFor="kb-hide-empty" className="text-sm font-normal cursor-pointer">
                  Hide empty stages
                </Label>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">Sources</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Uncheck to hide leads from that source. At least one must stay on.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {ALL_INQUIRY_SOURCES_SORTED.map((src) => (
                  <div key={src} className="flex items-center space-x-2">
                    <Checkbox
                      id={`kb-src-${src}`}
                      checked={selectedSources.has(src)}
                      disabled={selectedSources.has(src) && selectedSources.size === 1}
                      onCheckedChange={(v) => toggleSource(src, v === true)}
                    />
                    <Label
                      htmlFor={`kb-src-${src}`}
                      className="text-sm font-normal cursor-pointer leading-tight"
                    >
                      {sourceCheckboxLabel(src)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={groupOpen} onOpenChange={setGroupOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors",
              prefs.groupMode !== "none"
                ? "text-primary dark:text-[#D4AF37] bg-primary/10 dark:bg-primary/15"
                : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[#2C2C2C]",
            )}
          >
            <span className="material-symbols-outlined text-lg">view_module</span>
            <span className="hidden sm:inline">Group by</span>
            <span className="sm:hidden">Group</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="end">
          <div className="flex flex-col gap-1">
            {GROUP_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={prefs.groupMode === opt.value ? "secondary" : "ghost"}
                className="justify-start font-normal"
                onClick={() => {
                  setGroupMode(opt.value);
                  setGroupOpen(false);
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-2">
            Current: {groupSummary}
          </p>
        </PopoverContent>
      </Popover>

      <Popover open={sortOpen} onOpenChange={setSortOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors",
              prefs.sortMode !== "newest"
                ? "text-primary dark:text-[#D4AF37] bg-primary/10 dark:bg-primary/15"
                : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[#2C2C2C]",
            )}
          >
            <span className="material-symbols-outlined text-lg">sort</span>
            <span>Sort</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="end">
          <div className="flex flex-col gap-1">
            {SORT_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={prefs.sortMode === opt.value ? "secondary" : "ghost"}
                className="justify-start font-normal"
                onClick={() => {
                  setSortMode(opt.value);
                  setSortOpen(false);
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-2">
            Current: {sortSummary}
          </p>
        </PopoverContent>
      </Popover>
    </>
  );
}
