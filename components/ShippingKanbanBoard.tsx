"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ShippingKanbanColumn } from "./ShippingKanbanColumn";
import { VehicleCard } from "./VehicleCard";
import { ShippingStage } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

interface Vehicle {
  id: string;
  vin: string;
  stockNo: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  currentShippingStage: ShippingStage | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  shippingStage: {
    dhlTracking: string | null;
    yard: {
      id: string;
      name: string;
    } | null;
  } | null;
  _count: {
    documents: number;
    stageCosts: number;
  };
  createdAt: string;
}

interface Stage {
  id: string;
  name: string;
  order: number;
  stage: ShippingStage;
  vehicles: Vehicle[];
}

interface ShippingKanbanBoardProps {
  customerId?: string;
}

export function ShippingKanbanBoard({ customerId }: ShippingKanbanBoardProps) {
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [filterType, setFilterType] = useState<"all" | "mine">("all");
  const [dhlTrackingDialogOpen, setDhlTrackingDialogOpen] = useState(false);
  const [pendingStageChange, setPendingStageChange] = useState<{
    vehicleId: string;
    newStage: ShippingStage;
  } | null>(null);
  const [dhlTrackingInput, setDhlTrackingInput] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  useEffect(() => {
    fetchBoard();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBoard, 30000);

    // Listen for filter changes from ShippingKanbanFilter
    const handleFilterChange = (event: CustomEvent) => {
      setFilterType(event.detail.filterType);
    };
    window.addEventListener(
      "shippingKanbanFilterChange",
      handleFilterChange as EventListener,
    );

    return () => {
      clearInterval(interval);
      window.removeEventListener(
        "shippingKanbanFilterChange",
        handleFilterChange as EventListener,
      );
    };
  }, [customerId, filterType]);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (customerId) {
        params.append("customerId", customerId);
      }
      if (filterType) {
        params.append("filterType", filterType);
      }

      const response = await fetch(`/api/shipping-kanban?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStages(data.stages);
      }
    } catch (error) {
      console.error("Error fetching shipping kanban board:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    // Find the vehicle being dragged
    for (const stage of stages) {
      const vehicle = stage.vehicles.find((v) => v.id === active.id);
      if (vehicle) {
        setActiveVehicle(vehicle);
        break;
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveVehicle(null);

    if (!over) return;

    const vehicleId = active.id as string;
    let targetStageId = over.id as string;

    // If dropping on another vehicle card, find which stage that card belongs to
    let targetStage = stages.find((stage) => stage.id === targetStageId);

    // If not found, it might be another vehicle card - find which stage it belongs to
    if (!targetStage) {
      for (const stage of stages) {
        const foundVehicle = stage.vehicles.find((v) => v.id === targetStageId);
        if (foundVehicle) {
          targetStage = stage;
          targetStageId = stage.id;
          break;
        }
      }
    }

    // Still not found? Try to find by droppable data attribute
    if (!targetStage && over.data.current) {
      const droppableId = over.data.current.droppableId;
      if (droppableId) {
        targetStage = stages.find((stage) => stage.id === droppableId);
        if (targetStage) {
          targetStageId = targetStage.id;
        }
      }
    }

    if (!targetStage) {
      console.warn("Could not find target stage for drag operation");
      return;
    }

    // Find the source stage and vehicle
    let sourceStage: Stage | undefined;
    let vehicle: Vehicle | undefined;

    for (const stage of stages) {
      const foundVehicle = stage.vehicles.find((v) => v.id === vehicleId);
      if (foundVehicle) {
        sourceStage = stage;
        vehicle = foundVehicle;
        break;
      }
    }

    if (!sourceStage || !vehicle || sourceStage.id === targetStage.id) {
      return;
    }

    // Check if moving to DHL stage and if DHL tracking is missing
    if (targetStage.stage === ShippingStage.DHL && !vehicle.shippingStage?.dhlTracking) {
      // Store pending stage change and prompt for DHL tracking
      setPendingStageChange({ vehicleId, newStage: targetStage.stage });
      setDhlTrackingInput("");
      setDhlTrackingDialogOpen(true);
      return; // Don't proceed with stage change yet
    }

    // Optimistically update UI
    const newStages = stages.map((stage) => {
      if (stage.id === sourceStage!.id) {
        return {
          ...stage,
          vehicles: stage.vehicles.filter((v) => v.id !== vehicleId),
        };
      }
      if (stage.id === targetStage.id) {
        return {
          ...stage,
          vehicles: [...stage.vehicles, vehicle!],
        };
      }
      return stage;
    });
    setStages(newStages);

    // Update on server
    performStageChange(vehicleId, targetStage.stage, null);
  };

  const performStageChange = async (
    vehicleId: string,
    newStage: ShippingStage,
    dhlTracking: string | null
  ) => {
    try {
      const response = await fetch("/api/shipping-kanban", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId,
          newStage,
          dhlTracking,
        }),
      });

      if (!response.ok) {
        // Revert on error
        fetchBoard();
        alert("Failed to update vehicle stage");
      } else {
        // Refresh board to get updated data
        fetchBoard();
      }
    } catch (error) {
      console.error("Error updating stage:", error);
      // Revert on error
      fetchBoard();
      alert("Failed to update vehicle stage");
    }
  };

  const handleDhlTrackingSubmit = () => {
    if (!pendingStageChange) return;

    if (!dhlTrackingInput.trim()) {
      alert("Please enter DHL tracking number");
      return;
    }

    // Close dialog
    setDhlTrackingDialogOpen(false);

    // Optimistically update UI
    const vehicle = stages
      .flatMap((s) => s.vehicles)
      .find((v) => v.id === pendingStageChange.vehicleId);
    
    if (vehicle) {
      const sourceStage = stages.find((s) =>
        s.vehicles.some((v) => v.id === pendingStageChange.vehicleId)
      );
      
      if (sourceStage) {
        const newStages = stages.map((stage) => {
          if (stage.id === sourceStage.id) {
            return {
              ...stage,
              vehicles: stage.vehicles.filter(
                (v) => v.id !== pendingStageChange.vehicleId
              ),
            };
          }
          if (stage.stage === pendingStageChange.newStage) {
            return {
              ...stage,
              vehicles: [...stage.vehicles, vehicle],
            };
          }
          return stage;
        });
        setStages(newStages);
      }
    }

    // Update on server with DHL tracking
    performStageChange(
      pendingStageChange.vehicleId,
      pendingStageChange.newStage,
      dhlTrackingInput.trim()
    );

    // Reset state
    setPendingStageChange(null);
    setDhlTrackingInput("");
  };

  const handleDhlTrackingCancel = () => {
    setDhlTrackingDialogOpen(false);
    setPendingStageChange(null);
    setDhlTrackingInput("");
    fetchBoard(); // Refresh to revert any UI changes
  };

  const handleViewVehicle = (vehicleId: string) => {
    router.push(`/dashboard/vehicles/${vehicleId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading kanban board...</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto overflow-y-hidden pb-4">
        {stages.map((stage) => (
          <ShippingKanbanColumn
            key={stage.id}
            id={stage.id}
            title={stage.name}
            stage={stage.stage}
            vehicles={stage.vehicles}
            onView={handleViewVehicle}
          />
        ))}
        {/* Add Column Button */}
        <div className="min-w-[360px] flex items-center justify-center flex-shrink-0">
          <button className="w-full h-12 border-2 border-dashed border-gray-300 dark:border-[#2C2C2C] rounded-lg hover:border-gray-400 dark:hover:border-[#49454F] hover:bg-gray-50 dark:hover:bg-[#1E1E1E] transition-colors flex items-center justify-center gap-2 text-gray-500 dark:text-[#A1A1A1]">
            <span className="material-symbols-outlined text-xl">add</span>
            <span className="text-sm font-medium">Add Column</span>
          </button>
        </div>
      </div>
      <DragOverlay>
        {activeVehicle ? (
          <div className="opacity-90 rotate-2">
            <VehicleCard vehicle={activeVehicle} />
          </div>
        ) : null}
      </DragOverlay>

      {/* DHL Tracking Dialog */}
      <Dialog open={dhlTrackingDialogOpen} onOpenChange={setDhlTrackingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>DHL Tracking Required</DialogTitle>
            <DialogDescription>
              Please enter the DHL tracking number before moving this vehicle to Completed stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="dhlTracking">DHL Tracking Number</Label>
              <Input
                id="dhlTracking"
                value={dhlTrackingInput}
                onChange={(e) => setDhlTrackingInput(e.target.value)}
                placeholder="Enter DHL tracking number"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleDhlTrackingSubmit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDhlTrackingCancel}>
              Cancel
            </Button>
            <Button onClick={handleDhlTrackingSubmit}>
              Save & Move to Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
