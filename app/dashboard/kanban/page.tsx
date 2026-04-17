import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { PipelineSearchProvider } from "@/components/PipelineSearchContext";
import { KanbanPipelinePage } from "@/components/KanbanPipelinePage";

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
  const canAssignLeads =
    session.user.role === UserRole.MANAGER ||
    session.user.role === UserRole.ADMIN ||
    session.user.role === UserRole.BACK_OFFICE_STAFF;

  const userIdFromUrl = firstQueryValue(searchParams.userId);
  if (isManager && !userIdFromUrl) {
    redirect(buildKanbanUrlWithUserIdMe(searchParams));
  }

  let users: Array<{ id: string; name: string | null; email: string }> = [];
  if (isManager || session.user.role === UserRole.BACK_OFFICE_STAFF) {
    users = await prisma.user.findMany({
      where: {
        role: {
          in: [
            UserRole.SALES,
            UserRole.MANAGER,
            UserRole.ADMIN,
            UserRole.BACK_OFFICE_STAFF,
          ],
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
      <KanbanPipelinePage
        isManager={isManager}
        isAdmin={isAdmin}
        canAssignLeads={canAssignLeads}
        users={users}
        currentUserId={session.user.id}
        currentUserEmail={session.user.email || ""}
      />
    </PipelineSearchProvider>
  );
}
