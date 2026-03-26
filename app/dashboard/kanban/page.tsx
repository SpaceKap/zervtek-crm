import { KanbanBoard } from "@/components/KanbanBoard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { KanbanBoardFilter } from "@/components/KanbanBoardFilter";
import { PipelineKanbanToolbar } from "@/components/PipelineKanbanToolbar";
import { KanbanSearch } from "@/components/KanbanSearch";
import { PipelineSearchProvider } from "@/components/PipelineSearchContext";
import { Suspense } from "react";

function firstQueryValue(
  v: string | string[] | undefined,
): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}

/** Preserve pipeline query keys when adding default userId for managers. */
function buildKanbanUrlWithUserIdMe(
  sp: Record<string, string | string[] | undefined>,
): string {
  const p = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (key === "userId") continue;
    if (val === undefined || val === "") continue;
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item) p.append(key, item);
      }
    } else {
      p.set(key, val);
    }
  }
  p.set("userId", "me");
  const qs = p.toString();
  return qs ? `/dashboard/kanban?${qs}` : "/dashboard/kanban?userId=me";
}

export default async function KanbanPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) as Record<
    string,
    string | string[] | undefined
  >;
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  if (session.user.role === UserRole.ACCOUNTANT) {
    redirect("/dashboard");
  }

  const isManager =
    session.user.role === UserRole.MANAGER ||
    session.user.role === UserRole.ADMIN;
  const isAdmin = session.user.role === UserRole.ADMIN;

  const userIdFromUrl = firstQueryValue(searchParams.userId);
  if (isManager && !userIdFromUrl) {
    redirect(buildKanbanUrlWithUserIdMe(searchParams));
  }

  // Get all users (sales, managers, admins) for manager/admin filter and assign
  let users: Array<{ id: string; name: string | null; email: string }> = [];
  if (isManager) {
    users = await prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.SALES, UserRole.MANAGER, UserRole.ADMIN],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  return (
    <PipelineSearchProvider
      initialQuery={firstQueryValue(searchParams.q) ?? ""}
    >
      <div className="h-[calc(100dvh-7rem)] sm:h-[calc(100vh-8rem)] flex flex-col min-h-0">
        {/* Header */}
        <div className="mb-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="material-symbols-outlined text-3xl sm:text-4xl text-primary dark:text-[#D4AF37]">
              view_kanban
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Pipeline
              </h1>
              <p className="text-muted-foreground mt-1">
                Drag and drop inquiries between stages to update their status
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
            <Suspense fallback={<div className="w-[280px] h-10" />}>
              <KanbanSearch />
            </Suspense>
            {isManager && (
              <Suspense fallback={<div className="w-48 h-10" />}>
                <KanbanBoardFilter
                  currentUserId={session.user.id}
                  users={users}
                />
              </Suspense>
            )}
            <Suspense fallback={<div className="flex gap-2 h-10 w-[200px]" />}>
              <PipelineKanbanToolbar />
            </Suspense>
            <button className="p-1.5 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded transition-colors">
              <span className="material-symbols-outlined text-lg">
                more_vert
              </span>
            </button>
          </div>
        </div>
        </div>
        {/* Kanban Board - Full Width */}
        <div className="flex-1 bg-gray-50 dark:bg-[#121212] rounded-lg p-4 overflow-hidden">
          <KanbanBoard
            isManager={isManager}
            isAdmin={isAdmin}
            users={users}
            currentUserId={session.user.id}
            currentUserEmail={session.user.email || ""}
          />
        </div>
      </div>
    </PipelineSearchProvider>
  );
}
