"use client";

import { useState, useEffect } from "react";
import { ShippingStage } from "@prisma/client";
import { formatDistanceToNow, format } from "date-fns";

interface HistoryEntry {
  id: string;
  previousStage: ShippingStage | null;
  newStage: ShippingStage;
  action: string;
  notes: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface VehicleStageHistoryProps {
  vehicleId: string;
}

const stageLabels: Record<ShippingStage, string> = {
  PURCHASE: "Purchase",
  TRANSPORT: "Transport",
  REPAIR: "Repair",
  DOCUMENTS: "Documents",
  BOOKING: "Booking",
  SHIPPED: "Shipped",
  DHL: "Completed",
};

export function VehicleStageHistory({ vehicleId }: VehicleStageHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const INITIAL_ITEMS_TO_SHOW = 5;

  useEffect(() => {
    fetchHistory();
  }, [vehicleId]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/stages`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.stageHistory || []);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground">
        No history available
      </div>
    );
  }

  const shouldShowMoreButton = history.length > INITIAL_ITEMS_TO_SHOW;
  const visibleHistory = showAll
    ? history
    : history.slice(0, INITIAL_ITEMS_TO_SHOW);

  return (
    <div className="relative">
      {/* Vertical Timeline */}
      <div className="space-y-0 relative">
        {visibleHistory.map((entry, index) => {
          const isLastVisible = index === visibleHistory.length - 1;
          const isLastInFullList =
            !showAll && index === INITIAL_ITEMS_TO_SHOW - 1;
          const isActuallyLast = index === history.length - 1;

          return (
            <div key={entry.id} className="relative pl-6 pb-4 last:pb-0">
              {/* Timeline Line */}
              {!isActuallyLast && (
                <div className="absolute left-2 top-4 bottom-0 w-0.5 bg-gray-200 dark:bg-[#2C2C2C]" />
              )}

              {/* Timeline Dot */}
              <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-primary dark:bg-[#D4AF37] border-2 border-background dark:border-[#121212] z-10" />

              {/* Content */}
              <div className="text-xs">
                <div className="font-medium text-gray-900 dark:text-white mb-0.5">
                  {entry.previousStage
                    ? `${stageLabels[entry.previousStage]} → ${stageLabels[entry.newStage]}`
                    : `Started at ${stageLabels[entry.newStage]}`}
                </div>
                {entry.action && (
                  <div className="text-muted-foreground mb-1">
                    {entry.action}
                  </div>
                )}
                {entry.notes && (
                  <div className="text-muted-foreground text-[10px] mb-1 italic">
                    {entry.notes}
                  </div>
                )}
                <div className="text-muted-foreground text-[10px] flex items-center gap-2 mt-1">
                  <span>{entry.user.name || entry.user.email}</span>
                  <span>•</span>
                  <span>
                    {entry.createdAt &&
                    !isNaN(new Date(entry.createdAt).getTime())
                      ? format(new Date(entry.createdAt), "MMM dd, HH:mm")
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Gradient Fade Overlay - Only show when collapsed and there are more items */}
        {!showAll && shouldShowMoreButton && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Show More/Less Button */}
      {shouldShowMoreButton && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-primary dark:text-[#D4AF37] hover:underline font-medium"
          >
            {showAll
              ? "Show Less"
              : `Show More (${history.length - INITIAL_ITEMS_TO_SHOW} more)`}
          </button>
        </div>
      )}
    </div>
  );
}
