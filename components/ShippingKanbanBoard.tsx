"use client";

import { useState, useEffect } from "react";
import { ShippingKanbanColumn } from "./ShippingKanbanColumn";
import { ShippingStage } from "@prisma/client";
import { useRouter } from "next/navigation";

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
    etd: string | null;
    eta: string | null;
    vesselName: string | null;
    voyageNo: string | null;
    totalCharges: any;
    totalReceived: any;
    purchasePaid: boolean;
    bookingType: string | null;
    bookingStatus: string | null;
    yard: {
      id: string;
      name: string;
    } | null;
    freightVendor: {
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
  const [filterType, setFilterType] = useState<"all" | "mine">("all");

  useEffect(() => {
    fetchBoard();
    const interval = setInterval(fetchBoard, 30000);
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
        setStages(data.stages || []);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("[Shipping Kanban] API error:", response.status, errorData);
        setStages([]);
      }
    } catch (error) {
      console.error("Error fetching shipping kanban board:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewVehicle = (vehicleId: string) => {
    router.push(`/dashboard/vehicles/${vehicleId}`);
  };

  if (loading && stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-[#D4AF37] mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading kanban board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {loading && stages.length > 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/70 dark:bg-[#121212]/70 rounded-lg">
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#1E1E1E] rounded-lg shadow-md">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Refreshing...
            </span>
          </div>
        </div>
      )}
      <div className="flex gap-4 h-full overflow-x-auto overflow-y-hidden pb-4 scrollbar-modern-horizontal">
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
        <div className="min-w-[360px] flex items-center justify-center flex-shrink-0">
          <button className="w-full h-12 border-2 border-dashed border-gray-300 dark:border-[#2C2C2C] rounded-lg hover:border-gray-400 dark:hover:border-[#49454F] hover:bg-gray-50 dark:hover:bg-[#1E1E1E] transition-colors flex items-center justify-center gap-2 text-gray-500 dark:text-[#A1A1A1]">
            <span className="material-symbols-outlined text-xl">add</span>
            <span className="text-sm font-medium">Add Column</span>
          </button>
        </div>
      </div>
    </div>
  );
}
