import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageUsers } from "@/lib/permissions";
import { AdminCustomersList } from "@/components/AdminCustomersList";

export default async function AdminCustomersPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  if (!canManageUsers(session.user.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Customer Database
        </h1>
        <p className="text-muted-foreground">
          View and manage all customer information
        </p>
      </div>

      <AdminCustomersList />
    </div>
  );
}
