import { DashboardPageClient } from "@/components/DashboardPageClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const isManager =
    session.user.role === UserRole.MANAGER ||
    session.user.role === UserRole.ADMIN;
  const isAdmin = session.user.role === UserRole.ADMIN;

  // Get all users for manager/admin assignment
  let users: Array<{ id: string; name: string | null; email: string }> = [];
  if (isManager) {
    users = await prisma.user.findMany({
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
    <DashboardPageClient
      isManager={isManager}
      isAdmin={isAdmin}
      users={users}
      showUnassignedOnly={true}
      currentUserId={session.user.id}
      currentUserEmail={session.user.email || ""}
    />
  );
}
