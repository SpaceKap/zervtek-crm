"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface ShippingKanbanFilterProps {
  users: User[];
}

export function ShippingKanbanFilter({ users }: ShippingKanbanFilterProps) {
  const [filterType, setFilterType] = useState<"all" | "mine">("all");
  const [open, setOpen] = useState(false);
  const isPwa = useStandalonePwa();

  const handleFilterChange = (type: "all" | "mine") => {
    setFilterType(type);
    // Update the ShippingKanbanBoard component via URL or context
    // For now, we'll use a custom event
    window.dispatchEvent(
      new CustomEvent("shippingKanbanFilterChange", {
        detail: { filterType: type },
      }),
    );
  };

  if (isPwa) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={filterType === "mine" ? "default" : "outline"}
            size="icon"
            className="h-10 w-10 rounded-full"
            aria-label={
              filterType === "mine" ? "Showing my vehicles" : "Showing all vehicles"
            }
          >
            <span className="material-symbols-outlined text-lg">filter_alt</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2" align="end">
          <div className="flex flex-col gap-1">
            <Button
              variant={filterType === "all" ? "secondary" : "ghost"}
              size="sm"
              className="justify-start"
              onClick={() => {
                handleFilterChange("all");
                setOpen(false);
              }}
            >
              <span className="material-symbols-outlined mr-2 text-base">
                directions_car
              </span>
              All vehicles
            </Button>
            <Button
              variant={filterType === "mine" ? "secondary" : "ghost"}
              size="sm"
              className="justify-start"
              onClick={() => {
                handleFilterChange("mine");
                setOpen(false);
              }}
            >
              <span className="material-symbols-outlined mr-2 text-base">
                person
              </span>
              My vehicles
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", users.length === 0 && "opacity-80")}>
      <Button
        variant={filterType === "all" ? "default" : "outline"}
        size="sm"
        onClick={() => handleFilterChange("all")}
      >
        All Vehicles
      </Button>
      <Button
        variant={filterType === "mine" ? "default" : "outline"}
        size="sm"
        onClick={() => handleFilterChange("mine")}
      >
        My Vehicles
      </Button>
    </div>
  );
}
