"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface KanbanBoardFilterProps {
  users: User[];
}

export function KanbanBoardFilter({ users }: KanbanBoardFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentFilter, setCurrentFilter] = useState<string>("me");
  const [open, setOpen] = useState(false);
  const isPwa = useStandalonePwa();

  useEffect(() => {
    const userId = searchParams.get("userId");
    setCurrentFilter(userId ?? "me");
  }, [searchParams]);

  const handleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.set("userId", "all");
    } else if (value === "me") {
      params.set("userId", "me");
    } else {
      params.set("userId", value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const viewSummary = () => {
    if (currentFilter === "all") return "All inquiries";
    if (currentFilter === "me") return "My inquiries";
    const u = users.find((x) => x.id === currentFilter);
    return u?.name || u?.email || "Team member";
  };

  if (isPwa) {
    const isActive = currentFilter !== "me";
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
              isActive
                ? "bg-primary/15 text-primary dark:bg-[#D4AF37]/15 dark:text-[#D4AF37]"
                : "text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-[#2C2C2C]",
            )}
            aria-label={`Pipeline view: ${viewSummary()}`}
          >
            <span className="material-symbols-outlined text-[22px]">
              manage_accounts
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start" sideOffset={8}>
          <p className="mb-1.5 px-2 text-xs font-medium text-muted-foreground">
            View as
          </p>
          <div className="flex flex-col gap-0.5">
            <Button
              type="button"
              variant={currentFilter === "all" ? "secondary" : "ghost"}
              className="justify-start font-normal"
              onClick={() => {
                handleFilterChange("all");
                setOpen(false);
              }}
            >
              All inquiries
            </Button>
            <Button
              type="button"
              variant={currentFilter === "me" ? "secondary" : "ghost"}
              className="justify-start font-normal"
              onClick={() => {
                handleFilterChange("me");
                setOpen(false);
              }}
            >
              My inquiries
            </Button>
            {users.map((user) => (
              <Button
                key={user.id}
                type="button"
                variant={currentFilter === user.id ? "secondary" : "ghost"}
                className="justify-start font-normal"
                onClick={() => {
                  handleFilterChange(user.id);
                  setOpen(false);
                }}
              >
                {user.name || user.email}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-[#A1A1A1]">
        View:
      </label>
      <select
        value={currentFilter}
        onChange={(e) => handleFilterChange(e.target.value)}
        className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      >
        <option value="all">All Inquiries</option>
        <option value="me">My Inquiries</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name || user.email}
          </option>
        ))}
      </select>
    </div>
  );
}
