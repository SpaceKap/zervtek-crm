"use client";

import { Suspense } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { KanbanBoardFilter } from "@/components/KanbanBoardFilter";
import { PipelineKanbanToolbar } from "@/components/PipelineKanbanToolbar";
import { KanbanSearch } from "@/components/KanbanSearch";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface KanbanPipelinePageProps {
  isManager: boolean;
  isAdmin: boolean;
  users: User[];
  currentUserId: string;
  currentUserEmail: string;
}

export function KanbanPipelinePage({
  isManager,
  isAdmin,
  users,
  currentUserId,
  currentUserEmail,
}: KanbanPipelinePageProps) {
  const isPwa = useStandalonePwa();

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col",
        isPwa ? "min-h-0 flex-1 overflow-hidden" : "",
      )}
    >
      <div
        className={cn(
          "flex min-h-0 w-full flex-col",
          isPwa
            ? "h-[calc(100dvh-7rem)] min-h-0 overflow-hidden"
            : "h-[calc(100dvh-7rem)] sm:h-[calc(100vh-8rem)]",
        )}
      >
        <header className={cn("mb-4 shrink-0", isPwa && "mb-3 space-y-3")}>
          {isPwa ? (
            <>
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <span className="material-symbols-outlined shrink-0 text-3xl text-primary dark:text-[#D4AF37] sm:text-4xl">
                  view_kanban
                </span>
                <h1 className="min-w-0 text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                  Pipeline
                </h1>
              </div>
              <div className="scrollbar-modern-horizontal -mx-1 overflow-x-auto overflow-y-hidden px-1 pb-1">
                <div className="flex w-max min-w-full items-center gap-2 pr-3">
                  <Suspense fallback={<div className="h-10 w-10 shrink-0 rounded-lg bg-muted/60" />}>
                    <KanbanSearch />
                  </Suspense>
                  {isManager && (
                    <Suspense fallback={<div className="h-10 w-10 shrink-0 rounded-lg bg-muted/60" />}>
                      <KanbanBoardFilter users={users} />
                    </Suspense>
                  )}
                  <Suspense fallback={<div className="h-10 w-24 shrink-0 rounded-lg bg-muted/60" />}>
                    <PipelineKanbanToolbar />
                  </Suspense>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="material-symbols-outlined text-3xl text-primary dark:text-[#D4AF37] sm:text-4xl">
                    view_kanban
                  </span>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                    Pipeline
                  </h1>
                </div>
                <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
                  <Suspense fallback={<div className="h-10 w-[280px]" />}>
                    <KanbanSearch />
                  </Suspense>
                  {isManager && (
                    <Suspense fallback={<div className="h-10 w-48" />}>
                      <KanbanBoardFilter users={users} />
                    </Suspense>
                  )}
                  <Suspense fallback={<div className="flex h-10 w-[200px] gap-2" />}>
                    <PipelineKanbanToolbar />
                  </Suspense>
                  <button
                    type="button"
                    className="rounded p-1.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-[#2C2C2C]"
                    aria-label="More options"
                  >
                    <span className="material-symbols-outlined text-lg">more_vert</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </header>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-gray-50 p-4 dark:bg-[#121212]",
            isPwa && "min-h-0",
          )}
        >
          <KanbanBoard
            isManager={isManager}
            isAdmin={isAdmin}
            users={users}
            currentUserId={currentUserId}
            currentUserEmail={currentUserEmail}
          />
        </div>
      </div>
    </div>
  );
}
