import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageUsers } from "@/lib/permissions";
import { UserManagement } from "@/components/UserManagement";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  if (!canManageUsers(session.user.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-primary/10 dark:bg-[#D4AF37]/20">
          <span className="material-symbols-outlined text-3xl text-primary dark:text-[#D4AF37]">
            people
          </span>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            User Management
          </h1>
          <p className="text-muted-foreground mt-0.5">
            Manage user roles and permissions for your team
          </p>
        </div>
      </div>
      <UserManagement />
    </div>
  );
}
