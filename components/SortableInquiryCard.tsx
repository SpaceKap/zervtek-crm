"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { InquiryCard } from "./InquiryCard";
import { InquirySource, InquiryStatus } from "@prisma/client";

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
  onDelete?: (id: string) => void;
  currentUserId?: string;
  currentUserEmail?: string;
  isManager?: boolean;
  isAdmin?: boolean;
}

export function SortableInquiryCard({
  inquiry,
  onView,
  onRelease,
  onNotes,
  onDelete,
  currentUserId,
  currentUserEmail,
  isManager = false,
  isAdmin = false,
}: SortableInquiryCardProps) {
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
    transition: isDragging ? "none" : transition, // Disable transition during drag
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    willChange: isDragging ? "transform" : "auto", // Optimize for drag performance
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <InquiryCard
        inquiry={inquiry}
        onView={onView}
        onRelease={onRelease}
        onNotes={onNotes}
        onDelete={onDelete}
        showReleaseButton={true}
        showNotesButton={true}
        showDeleteButton={true}
        currentUserId={currentUserId}
        currentUserEmail={currentUserEmail}
        isManager={isManager}
        isAdmin={isAdmin}
        hideSourceBadge={false}
        hideStatusBadge={true}
        dragHandleProps={undefined}
        isInFunnel={true}
      />
    </div>
  );
});
