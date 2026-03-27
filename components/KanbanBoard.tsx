"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Suspense,
} from "react";
import { Button } from "@/components/ui/button";
import { KanbanColumn } from "./KanbanColumn";
import { InquiryStatus, InquirySource } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { AddInquiryDialog } from "./AddInquiryDialog";
import { NotesDialog } from "./NotesDialog";
import { ReleaseConfirmationDialog } from "./ReleaseConfirmationDialog";
import { AssignToDialog } from "./AssignToDialog";
import {
  usePipelineSearch,
  usePipelineViewPreferences,
} from "./PipelineSearchContext";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
  useDndMonitor,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  buildInquirySections,
  parsePipelineGroup,
  parsePipelineSort,
  parsePipelineSourcesFilter,
} from "@/lib/kanban-pipeline-view";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";
import { cn } from "@/lib/utils";

interface Inquiry {
  id: string;
  source: InquirySource;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  lookingFor?: string | null;
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
  /** When `filterControlledByParent`, drives the API filter (ManagerView). Otherwise read from URL. */
  userId?: string;
  /** If true, ignore URL `userId` and use `userId` prop only (embedded manager pipeline). */
  filterControlledByParent?: boolean;
  isManager?: boolean;
  isAdmin?: boolean;
  users?: Array<{ id: string; name: string | null; email: string }>;
  currentUserId?: string;
  currentUserEmail?: string;
  searchQuery?: string | null;
}

/** Drop on column id or on any card in that column (over.id is often the card, not the stage). */
function resolveTargetStageFromOver(
  stages: Stage[],
  overId: string,
): Stage | null {
  const asColumn = stages.find((s) => s.id === overId);
  if (asColumn) return asColumn;
  return (
    stages.find((s) => s.inquiries.some((inq) => inq.id === overId)) ?? null
  );
}

function inquiryMatchesSearch(inquiry: Inquiry, q: string): boolean {
  const raw = q.trim();
  if (!raw) return true;

  const meta = (inquiry.metadata as Record<string, unknown> | null) ?? {};
  const country =
    typeof meta.country === "string"
      ? meta.country.trim()
      : meta.country != null
        ? String(meta.country).trim()
        : "";

  const fields = [
    inquiry.customerName,
    inquiry.email,
    inquiry.phone,
    inquiry.message,
    inquiry.lookingFor,
    country || null,
  ].filter(Boolean) as string[];

  // "United States/Canada" or "US | CA" → match if any segment hits any field (OR).
  const orTerms = raw
    .split(/\s*[/|]\s*/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (orTerms.length === 0) return true;

  return orTerms.some((term) =>
    fields.some((f) => f.toLowerCase().includes(term)),
  );
}

function TrashDropZone({ compact = false }: { compact?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "trash" });
  return (
    <div
      ref={setNodeRef}
      className={`${compact ? "min-w-[72px]" : "min-w-[120px]"} flex flex-col items-center justify-center flex-shrink-0 rounded-lg border-2 border-dashed transition-colors ${
        isOver
          ? "bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600"
          : "border-gray-300 dark:border-[#2C2C2C] hover:border-red-300 dark:hover:border-red-700/50"
      }`}
    >
      <span
        className={`material-symbols-outlined text-3xl mb-1 ${
          isOver
            ? "text-red-600 dark:text-red-400"
            : "text-gray-400 dark:text-[#A1A1A1]"
        }`}
      >
        delete
      </span>
      <span className="text-xs font-medium text-gray-500 dark:text-[#A1A1A1]">
        Trash
      </span>
      {!compact && (
        <span className="text-[10px] text-gray-400 dark:text-[#6B6B6B] mt-0.5">
          Failed leads
        </span>
      )}
    </div>
  );
}

interface DndMonitorHandlerProps {
  canMergeInquiries: boolean;
  inquiryIdsSet: Set<string>;
  mergeTargetId: string | null;
  clearMergeState: () => void;
  setMergeHoldProgress: (value: React.SetStateAction<number>) => void;
  setMergeTargetId: (value: React.SetStateAction<string | null>) => void;
  mergeOverIdRef: React.MutableRefObject<string | null>;
  mergeHoldTimerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
}

function DndMonitorHandler({
  canMergeInquiries,
  inquiryIdsSet,
  mergeTargetId,
  clearMergeState,
  setMergeHoldProgress,
  setMergeTargetId,
  mergeOverIdRef,
  mergeHoldTimerRef,
}: DndMonitorHandlerProps) {
  useDndMonitor({
    onDragOver(event) {
      const { active, over } = event;
      if (!over?.id || active.id === over.id) {
        clearMergeState();
        return;
      }
      if (!canMergeInquiries) {
        clearMergeState();
        return;
      }
      const overId = String(over.id);
      if (!inquiryIdsSet.has(overId)) {
        clearMergeState();
        return;
      }
      if (mergeOverIdRef.current !== overId) {
        if (mergeHoldTimerRef.current) {
          clearInterval(mergeHoldTimerRef.current);
          mergeHoldTimerRef.current = null;
        }
        setMergeHoldProgress(0);
        setMergeTargetId(null);
        mergeOverIdRef.current = overId;
      }
      if (!mergeHoldTimerRef.current && mergeTargetId !== overId) {
        mergeHoldTimerRef.current = setInterval(() => {
          setMergeHoldProgress((p) => {
            const next = Math.min(1, p + 0.025);
            if (next >= 1) {
              setMergeTargetId(overId);
              if (mergeHoldTimerRef.current) {
                clearInterval(mergeHoldTimerRef.current);
                mergeHoldTimerRef.current = null;
              }
            }
            return next;
          });
        }, 50);
      }
    },
    onDragCancel() {
      clearMergeState();
    },
  });
  return null;
}

function KanbanBoardInner({
  userId: userIdProp,
  filterControlledByParent = false,
  isManager = false,
  isAdmin = false,
  users = [],
  currentUserId,
  currentUserEmail,
  searchQuery: searchQueryProp,
}: KanbanBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userIdFromUrl = searchParams.get("userId")?.trim() || undefined;
  const kanbanUserIdFilter = filterControlledByParent
    ? userIdProp || undefined
    : userIdFromUrl;
  const pipelineSearch = usePipelineSearch();
  const pipelineView = usePipelineViewPreferences();
  const isPwaStandalone = useStandalonePwa();
  const searchQuery = pipelineSearch?.searchQuery ?? searchQueryProp ?? undefined;
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [assignToDialogOpen, setAssignToDialogOpen] = useState(false);
  const [assignToInquiryId, setAssignToInquiryId] = useState<string | null>(
    null,
  );
  const [releasing, setReleasing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Merge mode: enter by long-press on a card; then drop on another card to merge (stable layout)
  const [mergeMode, setMergeMode] = useState(false);
  // Legacy: hold dragged card over another for 2s to enable merge (only when not in merge mode)
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [mergeHoldProgress, setMergeHoldProgress] = useState(0);
  const mergeHoldTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mergeOverIdRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // PWA (esp. iOS): larger distance so horizontal scroll is less likely to start a drag.
        distance: isPwaStandalone ? 30 : 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: isPwaStandalone
        ? { delay: 320, tolerance: 14 }
        : { delay: 3_600_000, tolerance: 0 },
    }),
  );

  const fetchBoard = useCallback(async () => {
    try {
      setLoading(true);
      const url = kanbanUserIdFilter
        ? `/api/kanban?userId=${encodeURIComponent(kanbanUserIdFilter)}`
        : "/api/kanban";
      if (process.env.NODE_ENV === "development") {
        console.log("[KanbanBoard] Fetching board from:", url);
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (process.env.NODE_ENV === "development") {
          console.log("[KanbanBoard] Received data:", {
            stagesCount: data.stages?.length || 0,
            stages: data.stages,
          });
        }
        setStages(data.stages || []);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("[KanbanBoard] API error:", response.status, errorData);
        setStages([]);
      }
    } catch (error) {
      console.error("[KanbanBoard] Fetch error:", error);
      setStages([]);
    } finally {
      setLoading(false);
    }
  }, [kanbanUserIdFilter]);

  useEffect(() => {
    fetchBoard();
    // Refresh every 30 seconds, but pause while notes dialog is open to avoid overwriting user input
    const interval = setInterval(() => {
      if (!notesDialogOpen) fetchBoard();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchBoard, notesDialogOpen]);

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
        let errorMessage = "Failed to release inquiry";
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        alert(errorMessage);
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

  const handleAssignTo = (inquiryId: string) => {
    setAssignToInquiryId(inquiryId);
    setAssignToDialogOpen(true);
  };

  const handleAssignToSuccess = () => {
    fetchBoard();
    setAssignToInquiryId(null);
  };

  const clearMergeState = useCallback(() => {
    if (mergeHoldTimerRef.current) {
      clearInterval(mergeHoldTimerRef.current);
      mergeHoldTimerRef.current = null;
    }
    setMergeHoldProgress(0);
    setMergeTargetId(null);
    mergeOverIdRef.current = null;
  }, []);

  const canMergeInquiries = isManager || isAdmin;

  const filteredStages = useMemo(() => {
    const q = searchQuery?.trim();
    if (!q) return stages;
    return stages.map((stage) => ({
      ...stage,
      inquiries: stage.inquiries.filter((inq) =>
        inquiryMatchesSearch(inq, q),
      ),
    }));
  }, [stages, searchQuery]);

  const displayStages = useMemo(() => {
    if (filterControlledByParent) {
      return filteredStages.map((stage) => ({
        ...stage,
        inquirySections: buildInquirySections(
          stage.inquiries,
          "newest",
          "none",
        ),
      }));
    }
    const sortMode =
      pipelineView != null
        ? pipelineView.prefs.sortMode
        : parsePipelineSort(searchParams.get("kbs"));
    const groupMode =
      pipelineView != null
        ? pipelineView.prefs.groupMode
        : parsePipelineGroup(searchParams.get("kbg"));
    const hideEmpty =
      pipelineView != null
        ? pipelineView.prefs.hideEmpty
        : searchParams.get("kbh") === "1";
    const sourceFilter =
      pipelineView != null
        ? pipelineView.prefs.sourcesAllowlist
        : parsePipelineSourcesFilter(searchParams.get("kbf"));

    let rows = filteredStages.map((stage) => {
      let inquiries = stage.inquiries;
      if (sourceFilter) {
        inquiries = inquiries.filter((i) => sourceFilter.has(i.source));
      }
      const inquirySections = buildInquirySections(
        inquiries,
        sortMode,
        groupMode,
      );
      return { ...stage, inquirySections };
    });
    if (hideEmpty) {
      rows = rows.filter((s) =>
        s.inquirySections.some((sec) => sec.inquiries.length > 0),
      );
    }
    return rows;
  }, [
    filteredStages,
    filterControlledByParent,
    pipelineView?.prefs.sortMode,
    pipelineView?.prefs.groupMode,
    pipelineView?.prefs.hideEmpty,
    pipelineView?.prefs.sourcesAllowlist,
    searchParams,
  ]);

  const inquiryIdsSet = useMemo(
    () =>
      new Set(
        displayStages.flatMap((s) =>
          s.inquirySections.flatMap((sec) => sec.inquiries.map((i) => i.id)),
        ),
      ),
    [displayStages],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    if (!mergeMode) {
      setMergeTargetId(null);
      setMergeHoldProgress(0);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const inquiryId = active.id as string;

    // Merge mode: drop on another card to merge (stable layout, no hold required)
    if (mergeMode) {
      clearMergeState();
      setActiveId(null);
      setMergeMode(false);
      if (over && over.id !== active.id && inquiryIdsSet.has(String(over.id))) {
        const targetForMerge = String(over.id);
        try {
          const response = await fetch(`/api/inquiries/${targetForMerge}/merge`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourceInquiryId: inquiryId }),
          });
          if (response.ok) {
            fetchBoard();
          } else {
            const err = await response.json();
            alert(err.error || "Failed to merge inquiries");
          }
        } catch (e) {
          console.error("Merge error:", e);
          alert("Failed to merge inquiries");
        }
      }
      return;
    }

    const targetForMerge = mergeTargetId;
    clearMergeState();
    setActiveId(null);

    if (!over) {
      return;
    }

    const targetIdStr = String(over.id);

    // Legacy merge: drop dragged card onto another after hold (Manager/Admin only)
    if (canMergeInquiries && targetForMerge && targetIdStr === targetForMerge) {
      try {
        const response = await fetch(`/api/inquiries/${targetForMerge}/merge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceInquiryId: inquiryId }),
        });
        if (response.ok) {
          fetchBoard();
        } else {
          const err = await response.json();
          alert(err.error || "Failed to merge inquiries");
        }
      } catch (e) {
        console.error("Merge error:", e);
        alert("Failed to merge inquiries");
      }
      return;
    }

    // Trash zone - move to failed leads
    if (targetIdStr === "trash") {
      setActiveId(null);
      try {
        const response = await fetch(
          `/api/inquiries/${inquiryId}/to-failed-lead`,
          {
            method: "POST",
          },
        );
        if (response.ok) {
          fetchBoard();
        } else {
          const err = await response.json();
          alert(err.error || "Failed to move to failed leads");
        }
      } catch (error) {
        console.error("Error moving to failed leads:", error);
        alert("Failed to move to failed leads");
      }
      return;
    }

    const targetStage = resolveTargetStageFromOver(stages, targetIdStr);
    if (!targetStage) {
      setActiveId(null);
      return;
    }

    // Find the inquiry and source stage
    let sourceStage: Stage | undefined;
    const inquiry = stages
      .flatMap((stage) => {
        if (stage.inquiries.some((inq) => inq.id === inquiryId)) {
          sourceStage = stage;
        }
        return stage.inquiries;
      })
      .find((inq) => inq.id === inquiryId);

    if (!inquiry || !sourceStage) {
      setActiveId(null);
      return;
    }

    // Don't update if already in the same stage
    if (inquiry.status === targetStage.status) {
      setActiveId(null);
      return;
    }

    // Store original state for potential revert
    const originalStages = stages;

    // Optimistic update: Update UI immediately (use functional update to avoid stale closure)
    setStages((prevStages) => {
      return prevStages.map((stage) => {
        if (stage.id === sourceStage!.id) {
          // Remove from source stage
          return {
            ...stage,
            inquiries: stage.inquiries.filter((inq) => inq.id !== inquiryId),
          };
        }
        if (stage.id === targetStage.id) {
          // Add to target stage with updated status
          return {
            ...stage,
            inquiries: [
              ...stage.inquiries,
              { ...inquiry, status: targetStage.status },
            ],
          };
        }
        return stage;
      });
    });

    // Clear active ID immediately after optimistic update
    setActiveId(null);

    // Sync with server in the background
    try {
      const response = await fetch("/api/kanban", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId,
          newStatus: targetStage.status,
        }),
      });

      if (!response.ok) {
        // Revert on error
        const error = await response.json();
        console.error("Failed to update inquiry status:", error);
        // Revert to original state
        setStages(originalStages);
        alert(error.error || "Failed to update inquiry status");
      }
      // On success, no need to refresh - optimistic update already done
    } catch (error) {
      console.error("Error updating inquiry status:", error);
      // Revert to original state
      setStages(originalStages);
      alert("Failed to update inquiry status");
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

  if (loading && stages.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-[#D4AF37] mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading kanban board...</p>
        </div>
      </div>
    );
  }

  const allInquiryIds = displayStages.flatMap((stage) =>
    stage.inquirySections.flatMap((sec) => sec.inquiries.map((inq) => inq.id)),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {!mergeMode && (
        <DndMonitorHandler
          canMergeInquiries={canMergeInquiries}
          inquiryIdsSet={inquiryIdsSet}
          mergeTargetId={mergeTargetId}
          clearMergeState={clearMergeState}
          setMergeHoldProgress={setMergeHoldProgress}
          setMergeTargetId={setMergeTargetId}
          mergeOverIdRef={mergeOverIdRef}
          mergeHoldTimerRef={mergeHoldTimerRef}
        />
      )}
      {mergeMode && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 mb-2 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/30 text-sm">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <span className="material-symbols-outlined text-lg">merge</span>
            Merge mode — drag a lead onto another to merge
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMergeMode(false)}
          >
            Cancel
          </Button>
        </div>
      )}
      <div className="relative h-full min-h-0">
        {loading && stages.length > 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/70 dark:bg-[#121212]/70 rounded-lg">
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#1E1E1E] rounded-lg shadow-md">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Refreshing...
              </span>
            </div>
          </div>
        )}
        <div
          className={cn(
            "flex h-full min-h-0 gap-4 overflow-x-auto overflow-y-hidden scrollbar-modern-horizontal",
            isPwaStandalone
              ? "snap-x snap-mandatory pb-4 px-1 [touch-action:pan-x]"
              : "pb-2",
          )}
        >
          <SortableContext
            items={mergeMode ? [] : allInquiryIds}
            strategy={verticalListSortingStrategy}
          >
            {displayStages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                id={stage.id}
                title={stage.name}
                color={stage.color}
                inquirySections={stage.inquirySections}
                onView={handleView}
                onCreateInquiry={handleCreateInquiry}
                status={stage.status}
                onRelease={handleRelease}
                onNotes={handleNotes}
                onAssignTo={handleAssignTo}
                onDelete={handleDelete}
                onCountryUpdated={fetchBoard}
                users={users}
                currentUserId={currentUserId}
                currentUserEmail={currentUserEmail}
                isManager={isManager}
                isAdmin={isAdmin}
                mergeTargetId={mergeTargetId}
                mergeHoldProgress={mergeHoldProgress}
                mergeMode={mergeMode}
                onEnterMergeMode={canMergeInquiries ? () => setMergeMode(true) : undefined}
              />
            ))}
          </SortableContext>
          {/* Trash - drag inquiries here to move to failed leads */}
          <TrashDropZone compact={isPwaStandalone} />
          {!isPwaStandalone && (
            <div className="min-w-[360px] flex items-center justify-center flex-shrink-0">
              <button className="w-full h-12 border-2 border-dashed border-gray-300 dark:border-[#2C2C2C] rounded-lg hover:border-gray-400 dark:hover:border-[#49454F] hover:bg-gray-50 dark:hover:bg-[#1E1E1E] transition-colors flex items-center justify-center gap-2 text-gray-500 dark:text-[#A1A1A1]">
                <span className="material-symbols-outlined text-xl">add</span>
                <span className="text-sm font-medium">Add Column</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <DragOverlay>
        {activeId ? (
          <div className="rotate-3 shadow-2xl">
            {(() => {
              const inquiry = stages
                .flatMap((stage) => stage.inquiries)
                .find((inq) => inq.id === activeId);
              if (!inquiry) return null;
              return (
                <div className="relative">
                  <div className="bg-white dark:bg-[#1E1E1E] border-2 border-primary dark:border-[#D4AF37] rounded-lg p-4 shadow-xl w-[320px]">
                    <div className="font-semibold text-sm mb-1">
                      {inquiry.customerName ||
                        inquiry.email ||
                        "Unknown Customer"}
                    </div>
                    {inquiry.email && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {inquiry.email}
                      </div>
                    )}
                  </div>
                  {(mergeMode || mergeTargetId) && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded shadow-lg whitespace-nowrap">
                      {mergeMode ? "Drop on a lead to merge" : "Release to merge into lead below"}
                    </div>
                  )}
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
      {assignToInquiryId && (
        <AssignToDialog
          open={assignToDialogOpen}
          onOpenChange={(open) => {
            setAssignToDialogOpen(open);
            if (!open) setAssignToInquiryId(null);
          }}
          inquiryId={assignToInquiryId}
          users={users}
          onSuccess={handleAssignToSuccess}
        />
      )}
    </DndContext>
  );
}

export function KanbanBoard(props: KanbanBoardProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[200px] items-center justify-center rounded-lg">
          <p className="text-sm text-gray-500 dark:text-[#A1A1A1]">
            Loading kanban board...
          </p>
        </div>
      }
    >
      <KanbanBoardInner {...props} />
    </Suspense>
  );
}
