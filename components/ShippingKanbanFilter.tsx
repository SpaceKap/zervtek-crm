"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="flex items-center gap-2">
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
