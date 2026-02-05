"use client";

import { useState, useEffect, useCallback } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { InquiryStatus, InquirySource } from "@prisma/client";
import { useRouter } from "next/navigation";
import { AddInquiryDialog } from "./AddInquiryDialog";
import { NotesDialog } from "./NotesDialog";
import { ReleaseConfirmationDialog } from "./ReleaseConfirmationDialog";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

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
  metadata?: any;
  assignedTo?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

interface Stage {
  id: string;
  name: string;
  order: number;
  color: string | null;
  status: InquiryStatus;
  inquiries: Inquiry[];
}

interface KanbanBoardProps {
  userId?: string;
  isManager?: boolean;
  isAdmin?: boolean;
  users?: Array<{ id: string; name: string | null; email: string }>;
  currentUserId?: string;
  currentUserEmail?: string;
}

export function KanbanBoard({
  userId,
  isManager = false,
  isAdmin = false,
  users = [],
  currentUserId,
  currentUserEmail,
}: KanbanBoardProps) {
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUserId, setFilterUserId] = useState<string | undefined>(userId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStatus, setDialogStatus] = useState<InquiryStatus | undefined>(
    undefined,
  );
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(
    null,
  );
  const [notes, setNotes] = useState<string>("");
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [pendingReleaseId, setPendingReleaseId] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  // Update filter when userId prop changes
  useEffect(() => {
    setFilterUserId(userId);
  }, [userId]);

  // Also check URL params on mount and when they change
  useEffect(() => {
    const updateFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const urlUserId = params.get("userId");
      if (urlUserId) {
        setFilterUserId(urlUserId);
      } else if (!userId) {
        setFilterUserId(undefined);
      }
    };

    updateFromUrl();
    // Listen for popstate events (back/forward navigation)
    window.addEventListener("popstate", updateFromUrl);
    return () => window.removeEventListener("popstate", updateFromUrl);
  }, [userId]);

  const fetchBoard = useCallback(async () => {
    try {
      setLoading(true);
      const url = filterUserId
        ? `/api/kanban?userId=${filterUserId}`
        : "/api/kanban";
      console.log("[KanbanBoard] Fetching board from:", url);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log("[KanbanBoard] Received data:", { stagesCount: data.stages?.length || 0, stages: data.stages });
        setStages(data.stages || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("[KanbanBoard] API error:", response.status, errorData);
        setStages([]);
      }
    } catch (error) {
      console.error("[KanbanBoard] Fetch error:", error);
      setStages([]);
    } finally {
      setLoading(false);
    }
  }, [filterUserId]);

  useEffect(() => {
    fetchBoard();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBoard, 30000);
    return () => clearInterval(interval);
  }, [fetchBoard]);

  const handleView = (inquiryId: string) => {
    router.push(`/dashboard/inquiries/${inquiryId}`);
  };

  const handleCreateInquiry = (status: InquiryStatus) => {
    setDialogStatus(status);
    setDialogOpen(true);
  };

  const handleInquiryCreated = () => {
    fetchBoard();
  };

  const handleRelease = (inquiryId: string) => {
    setPendingReleaseId(inquiryId);
    setReleaseDialogOpen(true);
  };

  const confirmRelease = async () => {
    if (!pendingReleaseId) return;

    try {
      setReleasing(true);
      const response = await fetch(
        `/api/inquiries/${pendingReleaseId}/release`,
        {
          method: "POST",
        },
      );
      if (response.ok) {
        setReleaseDialogOpen(false);
        setPendingReleaseId(null);
        // Redirect to dashboard after releasing
        router.push("/dashboard");
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to release inquiry");
      }
    } catch (error) {
      console.error("Error releasing inquiry:", error);
      alert("Failed to release inquiry");
    } finally {
      setReleasing(false);
    }
  };

  const handleNotes = async (inquiryId: string) => {
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || "");
        setSelectedInquiryId(inquiryId);
        setNotesDialogOpen(true);
      } else {
        // If no notes exist, just open the dialog
        setNotes("");
        setSelectedInquiryId(inquiryId);
        setNotesDialogOpen(true);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
      // Open dialog anyway
      setNotes("");
      setSelectedInquiryId(inquiryId);
      setNotesDialogOpen(true);
    }
  };

  const handleNotesSaved = () => {
    fetchBoard();
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const inquiryId = active.id as string;
    const targetStageId = over.id as string;

    // Find the target stage
    const targetStage = stages.find((stage) => stage.id === targetStageId);
    if (!targetStage) return;

    // Find the inquiry
    const inquiry = stages
      .flatMap((stage) => stage.inquiries)
      .find((inq) => inq.id === inquiryId);
    if (!inquiry) return;

    // Don't update if already in the same stage
    if (inquiry.status === targetStage.status) return;

    try {
      const response = await fetch("/api/kanban", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId,
          newStatus: targetStage.status,
        }),
      });

      if (response.ok) {
        fetchBoard();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update inquiry status");
        fetchBoard(); // Refresh to revert UI
      }
    } catch (error) {
      console.error("Error updating inquiry status:", error);
      alert("Failed to update inquiry status");
      fetchBoard(); // Refresh to revert UI
    }
  };

  const handleDelete = async (inquiryId: string) => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this inquiry? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/inquiries/${inquiryId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchBoard();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete inquiry");
      }
    } catch (error) {
      console.error("Error deleting inquiry:", error);
      alert("Failed to delete inquiry");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading kanban board...</p>
        </div>
      </div>
    );
  }

  const allInquiryIds = stages.flatMap((stage) =>
    stage.inquiries.map((inq) => inq.id),
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto overflow-y-hidden pb-4">
        <SortableContext
          items={allInquiryIds}
          strategy={verticalListSortingStrategy}
        >
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              id={stage.id}
              title={stage.name}
              color={stage.color}
              inquiries={stage.inquiries}
              onView={handleView}
              onCreateInquiry={handleCreateInquiry}
              status={stage.status}
              onRelease={handleRelease}
              onNotes={handleNotes}
              onDelete={handleDelete}
              currentUserId={currentUserId}
              currentUserEmail={currentUserEmail}
              isManager={isManager}
              isAdmin={isAdmin}
            />
          ))}
        </SortableContext>
        {/* Add Column Button */}
        <div className="min-w-[360px] flex items-center justify-center flex-shrink-0">
          <button className="w-full h-12 border-2 border-dashed border-gray-300 dark:border-[#2C2C2C] rounded-lg hover:border-gray-400 dark:hover:border-[#49454F] hover:bg-gray-50 dark:hover:bg-[#1E1E1E] transition-colors flex items-center justify-center gap-2 text-gray-500 dark:text-[#A1A1A1]">
            <span className="material-symbols-outlined text-xl">add</span>
            <span className="text-sm font-medium">Add Column</span>
          </button>
        </div>
      </div>
      <DragOverlay>
        {activeId ? (
          <div className="opacity-50">
            {(() => {
              const inquiry = stages
                .flatMap((stage) => stage.inquiries)
                .find((inq) => inq.id === activeId);
              if (!inquiry) return null;
              return (
                <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-lg p-4 shadow-lg">
                  <div className="font-semibold text-sm">
                    {inquiry.customerName || inquiry.email || "Unknown Customer"}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : null}
      </DragOverlay>
      <AddInquiryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleInquiryCreated}
        isManager={isManager}
        users={users}
        defaultStatus={dialogStatus}
      />
      {selectedInquiryId && (
        <NotesDialog
          open={notesDialogOpen}
          onOpenChange={setNotesDialogOpen}
          inquiryId={selectedInquiryId}
          currentNotes={notes}
          onSuccess={handleNotesSaved}
        />
      )}
      <ReleaseConfirmationDialog
        open={releaseDialogOpen}
        onOpenChange={setReleaseDialogOpen}
        onConfirm={confirmRelease}
        loading={releasing}
      />
    </DndContext>
  );
}
