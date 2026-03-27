import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageUsers } from "@/lib/permissions";
import { AdminCustomersList } from "@/components/AdminCustomersList";
import { AdminPageShell } from "@/components/AdminPageShell";

export default async function AdminCustomersPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  if (!canManageUsers(session.user.role)) {
    redirect("/dashboard");
  }

  return (
    <AdminPageShell
      icon="contacts"
      title="Customer Database"
      backHref="/dashboard/admin"
    >
      <AdminCustomersList />
    </AdminPageShell>
  );
}
