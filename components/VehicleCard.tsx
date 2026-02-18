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

interface VehicleCardProps {
  vehicle: Vehicle;
  onView?: (vehicleId: string) => void;
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
}: VehicleCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
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

  const stage = vehicle.currentShippingStage;
  const ss = vehicle.shippingStage;

  return (
    <Card
      onClick={handleCardClick}
      className={`bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] transition-all group ${
        onView
          ? "hover:border-gray-300 dark:hover:border-[#49454F] hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 cursor-pointer"
          : "cursor-default"
      }`}
    >
      <CardContent className="p-4">
        <div className="flex flex-col space-y-3">
          {vehicle.currentShippingStage && (
            <span
              className={`text-xs font-medium px-2 py-1 rounded border w-fit ${
                stageColors[vehicle.currentShippingStage]
              }`}
            >
              {stageLabels[vehicle.currentShippingStage]}
            </span>
          )}

          <div className="flex items-start gap-2">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug flex-1">
              {vehicleTitle}
            </h3>
          </div>
        </div>

        <div className="flex flex-col space-y-2.5 mt-1">
          <div className="text-xs text-gray-600 dark:text-[#A1A1A1]">
            <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">
              VIN:
            </span>{" "}
            <span className="font-mono">{vehicle.vin}</span>
          </div>

          {vehicle.stockNo && (
            <div className="text-xs text-gray-600 dark:text-[#A1A1A1]">
              <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">
                Stock:
              </span>{" "}
              <span>{vehicle.stockNo}</span>
            </div>
          )}

          {/* PURCHASE: Payment amount and status */}
          {stage === ShippingStage.PURCHASE && ss && (
            <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-[#2C2C2C]">
              <div className="text-xs text-gray-600 dark:text-[#A1A1A1]">
                <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">Payment:</span>{" "}
                ¥{parseFloat(ss.totalCharges?.toString() || "0").toLocaleString()} {ss.purchasePaid ? "• Paid" : "• Pending"}
              </div>
            </div>
          )}

          {/* TRANSPORT: Yard name */}
          {stage === ShippingStage.TRANSPORT && ss?.yard && (
            <div className="text-xs text-gray-600 dark:text-[#A1A1A1]">
              <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">Yard:</span>{" "}
              <span>{ss.yard.name}</span>
            </div>
          )}

          {/* BOOKING: Agent, type, status */}
          {stage === ShippingStage.BOOKING && ss && (
            <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-[#2C2C2C]">
              {ss.freightVendor && (
                <div className="text-xs text-gray-600 dark:text-[#A1A1A1]">
                  <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">Agent:</span>{" "}
                  <span>{ss.freightVendor.name}</span>
                </div>
              )}
              <div className="text-xs text-gray-600 dark:text-[#A1A1A1]">
                <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">Type:</span>{" "}
                <span>{ss.bookingType || "—"}</span>
                {" • "}
                <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">Status:</span>{" "}
                <span>{ss.bookingStatus || "—"}</span>
              </div>
            </div>
          )}

          {/* SHIPPED: ETD, ETA, ship name, voyage number */}
          {stage === ShippingStage.SHIPPED && ss && (
            <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-[#2C2C2C]">
              {(ss.etd || ss.eta) && (
                <div className="text-xs text-gray-600 dark:text-[#A1A1A1]">
                  {ss.etd && (
                    <>
                      <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">ETD:</span>{" "}
                      {format(new Date(ss.etd), "dd MMM yyyy")}
                    </>
                  )}
                  {ss.etd && ss.eta && " • "}
                  {ss.eta && (
                    <>
                      <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">ETA:</span>{" "}
                      {format(new Date(ss.eta), "dd MMM yyyy")}
                    </>
                  )}
                </div>
              )}
              {(ss.vesselName || ss.voyageNo) && (
                <div className="text-xs text-gray-600 dark:text-[#A1A1A1]">
                  <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">Ship:</span>{" "}
                  <span>{ss.vesselName || "—"}</span>
                  {ss.voyageNo && (
                    <>
                      {" • "}
                      <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">Voy:</span>{" "}
                      <span>{ss.voyageNo}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Yard (show for Transport if not already shown above) */}
          {stage !== ShippingStage.TRANSPORT && vehicle.shippingStage?.yard && (
            <div className="text-xs text-gray-600 dark:text-[#A1A1A1]">
              <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">Yard:</span>{" "}
              <span>{vehicle.shippingStage.yard.name}</span>
            </div>
          )}

          {vehicle.customer && (
            <div className="text-xs text-gray-600 dark:text-[#A1A1A1] pt-2 mt-2 border-t border-gray-100 dark:border-[#2C2C2C]">
              <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">
                Customer:
              </span>{" "}
              <span>{vehicle.customer.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#2C2C2C]">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-[#A1A1A1]">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">description</span>
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
