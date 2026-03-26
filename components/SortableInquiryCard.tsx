"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { InquiryCard } from "./InquiryCard";
import { InquirySource, InquiryStatus } from "@prisma/client";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";

interface Inquiry {
  id: string;
  source: InquirySource;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  status: InquiryStatus;
  assignedToId: string | null;
  createdAt: Date;
  assignedTo?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

interface SortableInquiryCardProps {
  inquiry: Inquiry;
  onView?: (id: string) => void;
  onRelease?: (id: string) => void;
  onNotes?: (id: string) => void;
  onAssignTo?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCountryUpdated?: (inquiryId: string) => void;
  currentUserId?: string;
  currentUserEmail?: string;
  isManager?: boolean;
  isAdmin?: boolean;
  isMergeTarget?: boolean;
  mergeHoldProgress?: number;
  onEnterMergeMode?: () => void;
}

function SortableInquiryCardComponent({
  inquiry,
  onView,
  onRelease,
  onNotes,
  onAssignTo,
  onDelete,
  onCountryUpdated,
  currentUserId,
  currentUserEmail,
  isManager = false,
  isAdmin = false,
  isMergeTarget = false,
  mergeHoldProgress = 0,
  onEnterMergeMode,
}: SortableInquiryCardProps) {
  const isPwa = useStandalonePwa();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: inquiry.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    willChange: isDragging ? "transform" : "auto",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="relative">
        {onEnterMergeMode && (
          <button
            type="button"
            className="absolute top-1 right-1 z-10 p-0.5 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onEnterMergeMode();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Enter merge mode"
            title="Merge mode – drag this lead onto another to merge"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              merge
            </span>
          </button>
        )}
        <InquiryCard
        inquiry={inquiry}
        onView={onView}
        onRelease={onRelease}
        onNotes={onNotes}
        onAssignTo={onAssignTo}
        onDelete={onDelete}
        onCountryUpdated={onCountryUpdated}
        showReleaseButton={true}
        showNotesButton={true}
        showCopyFieldIcons={!isPwa}
        showAssignToButton={true}
        showDeleteButton={true}
        currentUserId={currentUserId}
        currentUserEmail={currentUserEmail}
        isManager={isManager}
        isAdmin={isAdmin}
        hideSourceBadge={false}
        hideStatusBadge={true}
        dragHandleProps={undefined}
        isInFunnel={true}
        isMergeTarget={isMergeTarget}
        mergeHoldProgress={mergeHoldProgress}
      />
      </div>
    </div>
  );
}

export const SortableInquiryCard = memo(SortableInquiryCardComponent);
