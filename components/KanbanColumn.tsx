"use client";

import { memo } from "react";
import { SortableInquiryCard } from "./SortableInquiryCard";
import { InquiryStatus, InquirySource } from "@prisma/client";
import { useDroppable } from "@dnd-kit/core";

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

interface KanbanColumnProps {
  id: string;
  title: string;
  color?: string | null;
  inquiries: Inquiry[];
  onView?: (id: string) => void;
  onCreateInquiry?: (status: InquiryStatus) => void;
  status: InquiryStatus;
  onRelease?: (id: string) => void;
  onNotes?: (id: string) => void;
  onAssignTo?: (id: string) => void;
  onDelete?: (id: string) => void;
  users?: Array<{ id: string; name: string | null; email: string }>;
  currentUserId?: string;
  currentUserEmail?: string;
  isManager?: boolean;
  isAdmin?: boolean;
}

export const KanbanColumn = memo(function KanbanColumn({
  id,
  title,
  color,
  inquiries,
  onView,
  onCreateInquiry,
  status,
  onRelease,
  onNotes,
  onAssignTo,
  onDelete,
  currentUserId,
  currentUserEmail,
  isManager = false,
  isAdmin = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  // Smooth transition for drop zone highlight
  const dropZoneClass = isOver
    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
    : "";

  // Get color dot based on status
  const getStatusDot = () => {
    const statusColors: Record<string, string> = {
      NEW: "bg-yellow-400",
      CONTACTED: "bg-blue-400",
      QUALIFIED: "bg-green-400",
      DEPOSIT: "bg-purple-400",
      CLOSED_WON: "bg-green-500",
      CLOSED_LOST: "bg-gray-400",
      RECURRING: "bg-cyan-400",
    };
    return (
      statusColors[title.toUpperCase().replace(/\s+/g, "_")] || "bg-gray-400"
    );
  };

  return (
    <div className={`flex flex-col h-full min-w-[320px] max-w-[340px] bg-gray-50 dark:bg-[#1E1E1E] rounded-lg flex-shrink-0 border-2 transition-colors duration-200 ${dropZoneClass || "border-gray-200 dark:border-[#2C2C2C]"}`}>
      {/* Column Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#1E1E1E] rounded-t-lg flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusDot()}`} />
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
            {title}
          </h3>
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-[#2C2C2C] text-xs font-medium text-gray-600 dark:text-[#A1A1A1]">
            {inquiries.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateInquiry && onCreateInquiry(status);
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded transition-colors"
            title="Add inquiry"
          >
            <span className="material-symbols-outlined text-lg text-gray-500 dark:text-[#A1A1A1]">
              add
            </span>
          </button>
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded transition-colors">
            <span className="material-symbols-outlined text-lg text-gray-500 dark:text-[#A1A1A1]">
              more_vert
            </span>
          </button>
        </div>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className="flex-1 p-2 space-y-2 overflow-y-auto overflow-x-hidden min-h-[180px] transition-colors duration-200 scrollbar-modern-vertical"
      >
        {inquiries.map((inquiry) => (
          <SortableInquiryCard
            key={inquiry.id}
            inquiry={inquiry}
            onView={onView}
            onRelease={onRelease}
            onNotes={onNotes}
            onAssignTo={onAssignTo}
            onDelete={onDelete}
            currentUserId={currentUserId}
            currentUserEmail={currentUserEmail}
            isManager={isManager}
            isAdmin={isAdmin}
          />
        ))}
        {inquiries.length === 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateInquiry && onCreateInquiry(status);
            }}
            className="w-full flex flex-col items-center justify-center py-12 text-center hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#2C2C2C] flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-2xl text-gray-400 dark:text-[#A1A1A1]">
                add
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-[#A1A1A1]">
              Add inquiry
            </p>
          </button>
        )}
      </div>
    </div>
  );
});
