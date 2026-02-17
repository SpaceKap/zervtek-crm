"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ShippingStage } from "@prisma/client";
import { format } from "date-fns";

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

interface VehicleCardProps {
  vehicle: Vehicle;
  onView?: (vehicleId: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

const stageColors: Record<ShippingStage, string> = {
  PURCHASE: "bg-yellow-100 text-yellow-700 border-yellow-200",
  TRANSPORT: "bg-blue-100 text-blue-700 border-blue-200",
  REPAIR: "bg-purple-100 text-purple-700 border-purple-200",
  DOCUMENTS: "bg-orange-100 text-orange-700 border-orange-200",
  BOOKING: "bg-cyan-100 text-cyan-700 border-cyan-200",
  SHIPPED: "bg-indigo-100 text-indigo-700 border-indigo-200",
  DHL: "bg-pink-100 text-pink-700 border-pink-200",
};

const stageLabels: Record<ShippingStage, string> = {
  PURCHASE: "Purchase",
  TRANSPORT: "Transport",
  REPAIR: "Repair",
  DOCUMENTS: "Documents",
  BOOKING: "Booking",
  SHIPPED: "Shipped",
  DHL: "DHL",
};

export function VehicleCard({
  vehicle,
  onView,
  dragHandleProps,
}: VehicleCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on a button or interactive element
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest('[role="button"]')
    ) {
      return;
    }
    if (onView) {
      onView(vehicle.id);
    }
  };

  const vehicleTitle =
    vehicle.make && vehicle.model && vehicle.year
      ? `${vehicle.make} ${vehicle.model} ${vehicle.year}`
      : vehicle.vin || "Unknown Vehicle";

  return (
    <Card
      onClick={handleCardClick}
      className={`bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] transition-all group h-full flex flex-col ${
        onView
          ? "hover:border-gray-300 dark:hover:border-[#49454F] hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 cursor-pointer"
          : "cursor-default"
      }`}
    >
      <CardContent className="p-4 flex flex-col flex-1 min-h-0">
        {/* Header Section */}
        <div className="flex flex-col space-y-3 flex-shrink-0">
          {/* Stage Badge + Drag Handle */}
          <div className="flex items-start justify-between gap-2">
          {vehicle.currentShippingStage && (
              <span
                className={`text-xs font-medium px-2 py-1 rounded border ${
                  stageColors[vehicle.currentShippingStage]
                }`}
              >
                {stageLabels[vehicle.currentShippingStage]}
              </span>
            )}
            {dragHandleProps && (
              <div
                {...dragHandleProps}
                className="p-1 -m-1 rounded cursor-grab active:cursor-grabbing touch-none text-gray-400 hover:text-gray-600 dark:hover:text-[#A1A1A1]"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="material-symbols-outlined text-lg">drag_indicator</span>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="flex items-start gap-2">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug flex-1 cursor-pointer">
              {vehicleTitle}
            </h3>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-col space-y-2.5 flex-1 min-h-[60px] mt-1">
          {/* VIN */}
          <div className="text-xs text-gray-600 dark:text-[#A1A1A1]">
            <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">
              VIN:
            </span>{" "}
            <span className="font-mono">{vehicle.vin}</span>
          </div>

          {/* Stock Number */}
          {vehicle.stockNo && (
            <div className="text-xs text-gray-600 dark:text-[#A1A1A1]">
              <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">
                Stock:
              </span>{" "}
              <span>{vehicle.stockNo}</span>
            </div>
          )}

          {/* Customer */}
          {vehicle.customer && (
            <div className="text-xs text-gray-600 dark:text-[#A1A1A1] pt-2 mt-2 border-t border-gray-100 dark:border-[#2C2C2C]">
              <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">
                Customer:
              </span>{" "}
              <span>{vehicle.customer.name}</span>
            </div>
          )}

          {/* Yard */}
          {vehicle.shippingStage?.yard && (
            <div className="text-xs text-gray-600 dark:text-[#A1A1A1]">
              <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">
                Yard:
              </span>{" "}
              <span>{vehicle.shippingStage.yard.name}</span>
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#2C2C2C] flex-shrink-0 mt-auto">
          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-[#A1A1A1]">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">
                description
              </span>
              <span>{vehicle._count.documents}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">receipt</span>
              <span>{vehicle._count.invoices ?? vehicle._count.stageCosts}</span>
            </span>
            <span className="text-gray-400 dark:text-[#A1A1A1]">
              {format(new Date(vehicle.createdAt), "dd MMM yyyy")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
