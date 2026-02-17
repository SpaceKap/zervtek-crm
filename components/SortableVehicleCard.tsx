"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { VehicleCard } from "./VehicleCard";
import { ShippingStage } from "@prisma/client";

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
    yard: {
      id: string;
      name: string;
    } | null;
  } | null;
  _count: {
    documents: number;
    stageCosts: number;
    invoices?: number;
  };
  createdAt: string;
}

interface SortableVehicleCardProps {
  vehicle: Vehicle;
  onView?: (vehicleId: string) => void;
}

export function SortableVehicleCard({
  vehicle,
  onView,
}: SortableVehicleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: vehicle.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    opacity: isDragging ? 0.5 : 1,
    willChange: isDragging ? "transform" : "auto",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <VehicleCard
        vehicle={vehicle}
        onView={onView}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}
