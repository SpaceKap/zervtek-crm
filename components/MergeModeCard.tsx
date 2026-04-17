"use client";

import { memo, useRef } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
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

interface MergeModeCardProps {
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
  canAssignLeads?: boolean;
}

function MergeModeCardComponent({
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
  canAssignLeads = false,
}: MergeModeCardProps) {
  const isPwa = useStandalonePwa();
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({ id: inquiry.id });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: inquiry.id,
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-50" : ""}
    >
      <div
        className={
          isOver
            ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-[#1E1E1E] rounded-lg"
            : ""
        }
      >
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
          showAssignToButton={canAssignLeads}
          showDeleteButton={true}
          currentUserId={currentUserId}
          currentUserEmail={currentUserEmail}
          isManager={isManager}
          isAdmin={isAdmin}
          hideSourceBadge={false}
          hideStatusBadge={true}
          dragHandleProps={undefined}
          isInFunnel={true}
          isMergeTarget={isOver}
          mergeHoldProgress={1}
        />
      </div>
    </div>
  );
}

export const MergeModeCard = memo(MergeModeCardComponent);
