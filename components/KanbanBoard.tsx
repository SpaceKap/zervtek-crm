"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { InquiryCard } from "./InquiryCard";
import { InquiryStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { AddInquiryDialog } from "./AddInquiryDialog";
import { NotesDialog } from "./NotesDialog";

interface Inquiry {
  id: string;
  source: any;
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
}

export function KanbanBoard({
  userId,
  isManager = false,
  isAdmin = false,
  users = [],
  currentUserId,
}: KanbanBoardProps) {
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeInquiry, setActiveInquiry] = useState<Inquiry | null>(null);
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const url = filterUserId
        ? `/api/kanban?userId=${filterUserId}`
        : "/api/kanban";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setStages(data.stages || []);
      }
    } catch (error) {
      console.error("Error fetching kanban board:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBoard, 30000);
    return () => clearInterval(interval);
  }, [filterUserId]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    // Find the inquiry being dragged
    for (const stage of stages) {
      const inquiry = stage.inquiries.find((inq) => inq.id === active.id);
      if (inquiry) {
        setActiveInquiry(inquiry);
        break;
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveInquiry(null);

    if (!over) return;

    const inquiryId = active.id as string;
    let targetStageId = over.id as string;

    // If dropping on another inquiry card, find which stage that card belongs to
    // Otherwise, assume we're dropping directly on a column
    let targetStage = stages.find((stage) => stage.id === targetStageId);
    
    // If not found, it might be another inquiry card - find which stage it belongs to
    if (!targetStage) {
      for (const stage of stages) {
        const foundInquiry = stage.inquiries.find((inq) => inq.id === targetStageId);
        if (foundInquiry) {
          targetStage = stage;
          targetStageId = stage.id;
          break;
        }
      }
    }

    // Still not found? Try to find by droppable data attribute
    if (!targetStage && over.data.current) {
      const droppableId = over.data.current.droppableId;
      if (droppableId) {
        targetStage = stages.find((stage) => stage.id === droppableId);
        if (targetStage) {
          targetStageId = targetStage.id;
        }
      }
    }

    if (!targetStage) {
      console.warn("Could not find target stage for drag operation");
      return;
    }

    // Find the source stage and inquiry
    let sourceStage: Stage | undefined;
    let inquiry: Inquiry | undefined;

    for (const stage of stages) {
      const foundInquiry = stage.inquiries.find((inq) => inq.id === inquiryId);
      if (foundInquiry) {
        sourceStage = stage;
        inquiry = foundInquiry;
        break;
      }
    }

    if (!sourceStage || !inquiry || sourceStage.id === targetStage.id) {
      return;
    }

    // Optimistically update UI
    const newStages = stages.map((stage) => {
      if (stage.id === sourceStage!.id) {
        return {
          ...stage,
          inquiries: stage.inquiries.filter((inq) => inq.id !== inquiryId),
        };
      }
      if (stage.id === targetStage.id) {
        return {
          ...stage,
          inquiries: [
            ...stage.inquiries,
            { ...inquiry!, status: targetStage.status },
          ],
        };
      }
      return stage;
    });
    setStages(newStages);

    // Update in backend
    try {
      const response = await fetch(`/api/kanban`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inquiryId,
          newStatus: targetStage.status,
        }),
      });

      if (!response.ok) {
        // Revert on error
        fetchBoard();
        alert("Failed to update inquiry status");
      }
    } catch (error) {
      console.error("Error updating inquiry status:", error);
      // Revert on error
      fetchBoard();
      alert("Failed to update inquiry status");
    }
  };

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

  const handleRelease = async (inquiryId: string) => {
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}/release`, {
        method: "POST",
      });
      if (response.ok) {
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

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto overflow-y-hidden pb-4">
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
            currentUserId={currentUserId}
            isManager={isManager}
            isAdmin={isAdmin}
          />
        ))}
        {/* Add Column Button */}
        <div className="min-w-[360px] flex items-center justify-center flex-shrink-0">
          <button className="w-full h-12 border-2 border-dashed border-gray-300 dark:border-[#2C2C2C] rounded-lg hover:border-gray-400 dark:hover:border-[#49454F] hover:bg-gray-50 dark:hover:bg-[#1E1E1E] transition-colors flex items-center justify-center gap-2 text-gray-500 dark:text-[#A1A1A1]">
            <span className="material-symbols-outlined text-xl">add</span>
            <span className="text-sm font-medium">Add Column</span>
          </button>
        </div>
      </div>
      <DragOverlay>
        {activeInquiry ? (
          <div className="opacity-90 rotate-2">
            <InquiryCard inquiry={activeInquiry} isAdmin={isAdmin} />
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
    </DndContext>
  );
}
