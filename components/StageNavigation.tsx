"use client";

import { ShippingStage } from "@prisma/client";
import { Button } from "./ui/button";

const stageOrder: ShippingStage[] = [
  ShippingStage.PURCHASE,
  ShippingStage.TRANSPORT,
  ShippingStage.REPAIR,
  ShippingStage.DOCUMENTS,
  ShippingStage.BOOKING,
  ShippingStage.SHIPPED,
  ShippingStage.DHL,
];

const stageLabels: Record<ShippingStage, string> = {
  PURCHASE: "Purchase",
  TRANSPORT: "Transport",
  REPAIR: "Repair",
  DOCUMENTS: "Documents",
  BOOKING: "Booking",
  SHIPPED: "Shipped",
  DHL: "Completed",
};

interface StageNavigationProps {
  currentStage: ShippingStage | null; // The actual current stage of the vehicle
  viewingStage: ShippingStage; // The stage being viewed/edited
  onViewingStageChange: (stage: ShippingStage) => void;
  disabled?: boolean;
}

export function StageNavigation({
  currentStage,
  viewingStage,
  onViewingStageChange,
  disabled = false,
}: StageNavigationProps) {
  const currentIndex = stageOrder.indexOf(viewingStage);
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < stageOrder.length - 1;

  const handlePrevious = () => {
    if (canGoPrevious) {
      const previousStage = stageOrder[currentIndex - 1];
      onViewingStageChange(previousStage);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      const nextStage = stageOrder[currentIndex + 1];
      onViewingStageChange(nextStage);
    }
  };

  const isCurrentStage = currentStage === viewingStage;

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Viewing Stage Indicator */}
      {!isCurrentStage && (
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-muted-foreground italic">
            Viewing: {stageLabels[viewingStage]}
          </span>
        </div>
      )}
      {isCurrentStage && <div className="flex-1" />}

      {/* Navigation Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={!canGoPrevious || disabled}
          className="h-8 px-3"
        >
          <span className="material-symbols-outlined text-lg">
            chevron_left
          </span>
          <span className="sr-only">Previous Stage</span>
        </Button>

        {/* Stage Indicator */}
        <div className="flex items-center gap-1 px-3">
          {stageOrder.map((stage, index) => (
            <div
              key={stage}
              className={`h-2 w-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-primary dark:bg-[#D4AF37] w-8"
                  : index < currentIndex
                    ? "bg-green-500"
                    : "bg-gray-300 dark:bg-[#2C2C2C]"
              }`}
              title={stageLabels[stage]}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={!canGoNext || disabled}
          className="h-8 px-3"
        >
          <span className="material-symbols-outlined text-lg">
            chevron_right
          </span>
          <span className="sr-only">Next Stage</span>
        </Button>
      </div>
    </div>
  );
}
