import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageUsers } from "@/lib/permissions";
import { UserManagement } from "@/components/UserManagement";
import { AdminPageShell } from "@/components/AdminPageShell";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  if (!canManageUsers(session.user.role)) {
    redirect("/dashboard");
  }

  return (
    <AdminPageShell
      icon="people"
      title="User Management"
      backHref="/dashboard/admin"
    >
      <UserManagement />
    </AdminPageShell>
  );
}
