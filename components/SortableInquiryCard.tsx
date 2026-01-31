"use client";

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
  currentUserId?: string;
  isManager?: boolean;
  isAdmin?: boolean;
}

export function SortableInquiryCard({
  inquiry,
  onView,
  onRelease,
  onNotes,
  currentUserId,
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
    data: {
      inquiryId: inquiry.id,
      status: inquiry.status,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <InquiryCard
        inquiry={inquiry}
        onView={onView}
        onRelease={onRelease}
        onNotes={onNotes}
        showReleaseButton={true}
        showNotesButton={true}
        currentUserId={currentUserId}
        isManager={isManager}
        isAdmin={isAdmin}
        hideSourceBadge={true}
        hideStatusBadge={true}
        dragHandleProps={listeners}
      />
    </div>
  );
}
