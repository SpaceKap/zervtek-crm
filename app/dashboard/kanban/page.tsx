import { KanbanBoard } from "@/components/KanbanBoard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { KanbanBoardFilter } from "@/components/KanbanBoardFilter";
import { Suspense } from "react";

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: { userId?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const isManager =
    session.user.role === UserRole.MANAGER ||
    session.user.role === UserRole.ADMIN;
  const isAdmin = session.user.role === UserRole.ADMIN;

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
          <div className="flex items-center gap-3 flex-shrink-0">
            {isManager && (
              <Suspense fallback={<div className="w-48 h-10" />}>
                <KanbanBoardFilter
                  currentUserId={session.user.id}
                  users={users}
                />
              </Suspense>
            )}
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded transition-colors">
              <span className="material-symbols-outlined text-lg">tune</span>
              <span>Filter</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded transition-colors">
              <span className="material-symbols-outlined text-lg">
                view_module
              </span>
              <span>Group by</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded transition-colors">
              <span className="material-symbols-outlined text-lg">sort</span>
              <span>Sort</span>
            </button>
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
          userId={searchParams.userId}
          isManager={isManager}
          isAdmin={isAdmin}
          users={users}
          currentUserId={session.user.id}
          currentUserEmail={session.user.email || ""}
        />
      </div>
    </div>
  );
}
