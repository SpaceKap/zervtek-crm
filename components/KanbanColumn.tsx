"use client";

import { memo } from "react";
import { SortableInquiryCard } from "./SortableInquiryCard";
import { MergeModeCard } from "./MergeModeCard";
import { InquiryStatus, InquirySource } from "@prisma/client";
import { useDroppable } from "@dnd-kit/core";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";
import { cn } from "@/lib/utils";

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

export type KanbanInquirySection = { label: string; inquiries: Inquiry[] };

interface KanbanColumnProps {
  id: string;
  title: string;
  color?: string | null;
  /** Grouped rows within the column; use `[{ label: "", inquiries }]` for a flat list. */
  inquirySections: KanbanInquirySection[];
  onView?: (id: string) => void;
  onCreateInquiry?: (status: InquiryStatus) => void;
  status: InquiryStatus;
  onRelease?: (id: string) => void;
  onNotes?: (id: string) => void;
  onAssignTo?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCountryUpdated?: (inquiryId: string) => void;
  users?: Array<{ id: string; name: string | null; email: string }>;
  currentUserId?: string;
  currentUserEmail?: string;
  isManager?: boolean;
  isAdmin?: boolean;
  mergeTargetId?: string | null;
  mergeHoldProgress?: number;
  mergeMode?: boolean;
  onEnterMergeMode?: () => void;
}

export const KanbanColumn = memo(function KanbanColumn({
  id,
  title,
  color,
  inquirySections,
  onView,
  onCreateInquiry,
  status,
  onRelease,
  onNotes,
  onAssignTo,
  onDelete,
  onCountryUpdated,
  currentUserId,
  currentUserEmail,
  isManager = false,
  isAdmin = false,
  mergeTargetId = null,
  mergeHoldProgress = 0,
  mergeMode = false,
  onEnterMergeMode,
}: KanbanColumnProps) {
  const isPwa = useStandalonePwa();
  const totalInquiries = inquirySections.reduce(
    (n, s) => n + s.inquiries.length,
    0,
  );
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
    <div
      className={cn(
        "flex h-full flex-col rounded-lg bg-gray-50 transition-colors duration-200 dark:bg-[#1E1E1E] flex-shrink-0 border-2",
        isPwa
          ? "min-w-[86vw] max-w-[86vw] sm:min-w-[340px] sm:max-w-[360px]"
          : "min-w-[320px] max-w-[340px]",
        dropZoneClass || "border-gray-200 dark:border-[#2C2C2C]",
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          "flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white dark:border-[#2C2C2C] dark:bg-[#1E1E1E] rounded-t-lg",
          isPwa ? "p-3" : "p-4",
        )}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusDot()}`} />
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
            {title}
          </h3>
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-[#2C2C2C] text-xs font-medium text-gray-600 dark:text-[#A1A1A1]">
            {totalInquiries}
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
        className={cn(
          "flex min-h-[180px] flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain transition-colors duration-200 scrollbar-modern-vertical",
          isPwa ? "p-1.5 pb-2.5" : "p-2 pb-3",
        )}
      >
        <div className="flex-1 space-y-2 min-h-0">
        {inquirySections.map((section, sectionIdx) => (
          <div key={`${section.label || "flat"}-${sectionIdx}`} className="space-y-2">
            {section.label ? (
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 pt-1 border-b border-border/40 pb-1 mb-0.5">
                {section.label}
              </div>
            ) : null}
            {section.inquiries.map((inquiry) =>
              mergeMode ? (
                <MergeModeCard
                  key={inquiry.id}
                  inquiry={inquiry}
                  onView={onView}
                  onRelease={onRelease}
                  onNotes={onNotes}
                  onAssignTo={onAssignTo}
                  onDelete={onDelete}
                  onCountryUpdated={onCountryUpdated}
                  currentUserId={currentUserId}
                  currentUserEmail={currentUserEmail}
                  isManager={isManager}
                  isAdmin={isAdmin}
                />
              ) : (
                <SortableInquiryCard
                  key={inquiry.id}
                  inquiry={inquiry}
                  onView={onView}
                  onRelease={onRelease}
                  onNotes={onNotes}
                  onAssignTo={onAssignTo}
                  onDelete={onDelete}
                  onCountryUpdated={onCountryUpdated}
                  currentUserId={currentUserId}
                  currentUserEmail={currentUserEmail}
                  isManager={isManager}
                  isAdmin={isAdmin}
                  isMergeTarget={mergeTargetId === inquiry.id}
                  mergeHoldProgress={mergeHoldProgress}
                  onEnterMergeMode={onEnterMergeMode}
                />
              ),
            )}
          </div>
        ))}
        </div>
        {/* Extra hit area below cards so drops work when the column is full */}
        {totalInquiries > 0 && !mergeMode && (
          <div
            className="min-h-[min(140px,22dvh)] flex-shrink-0 rounded-md border border-dashed border-muted-foreground/15 bg-muted/20 dark:bg-muted/10 mt-1"
            aria-hidden
          />
        )}
        {totalInquiries === 0 && (
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
