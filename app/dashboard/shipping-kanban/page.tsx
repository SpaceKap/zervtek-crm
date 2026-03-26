import { ShippingKanbanBoard } from "@/components/ShippingKanbanBoard";
import { ShippingPipelineActions } from "@/components/ShippingPipelineActions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canCreateInvoice, canViewVehicles } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export default async function ShippingKanbanPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  if (!canViewVehicles(session.user.role)) {
    redirect("/dashboard");
  }

  const isAdmin = session.user.role === UserRole.ADMIN;
  const isManager = session.user.role === UserRole.MANAGER;
  const isBackOffice = session.user.role === UserRole.BACK_OFFICE_STAFF;
  const canFilter = isAdmin || isManager || isBackOffice;

  // Get users for filter (excluding ACCOUNTANT role)
  let users: Array<{ id: string; name: string | null; email: string }> = [];
  if (canFilter) {
    users = await prisma.user.findMany({
      where: {
        role: {
          not: UserRole.ACCOUNTANT,
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
              local_shipping
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Shipping Pipeline
              </h1>
            </div>
          </div>
          <ShippingPipelineActions
            canCreateInvoice={canCreateInvoice(session.user.role)}
            canFilter={canFilter}
            users={users}
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 min-h-0">
        <ShippingKanbanBoard />
      </div>
    </div>
  );
}
