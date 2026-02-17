"use client";

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
    etd?: string | null;
    eta?: string | null;
    vesselName?: string | null;
    voyageNo?: string | null;
    totalCharges?: any;
    totalReceived?: any;
    purchasePaid?: boolean;
    bookingType?: string | null;
    bookingStatus?: string | null;
    freightVendor?: {
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

interface ShippingKanbanColumnProps {
  id: string;
  title: string;
  stage: ShippingStage;
  vehicles: Vehicle[];
  onView?: (vehicleId: string) => void;
}

export function ShippingKanbanColumn({
  id,
  title,
  stage,
  vehicles,
  onView,
}: ShippingKanbanColumnProps) {
  const getStatusDot = () => {
    const stageColors: Record<string, string> = {
      PURCHASE: "bg-yellow-400",
      TRANSPORT: "bg-blue-400",
      REPAIR: "bg-purple-400",
      DOCUMENTS: "bg-orange-400",
      BOOKING: "bg-cyan-400",
      SHIPPED: "bg-indigo-400",
      DHL: "bg-green-400",
    };
    return stageColors[stage] || "bg-gray-400";
  };

  return (
    <div className="flex flex-col h-full min-w-[360px] max-w-[400px] bg-gray-50 dark:bg-[#1E1E1E] rounded-lg flex-shrink-0 border-2 border-gray-200 dark:border-[#2C2C2C]">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#1E1E1E] rounded-t-lg flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusDot()}`} />
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
            {title}
          </h3>
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-[#2C2C2C] text-xs font-medium text-gray-600 dark:text-[#A1A1A1]">
            {vehicles.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded transition-colors">
            <span className="material-symbols-outlined text-lg text-gray-500 dark:text-[#A1A1A1]">
              more_vert
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-3 space-y-3 overflow-y-auto overflow-x-hidden scrollbar-modern-vertical">
        {vehicles.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            onView={onView}
          />
        ))}
        {vehicles.length === 0 && (
          <div className="w-full flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#2C2C2C] flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-2xl text-gray-400 dark:text-[#A1A1A1]">
                local_shipping
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-[#A1A1A1]">
              No vehicles in this stage
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
