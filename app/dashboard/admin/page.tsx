import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageUsers } from "@/lib/permissions";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminHubGrid, AdminPageShell } from "@/components/AdminPageShell";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  if (!canManageUsers(session.user.role)) {
    redirect("/dashboard");
  }

  return (
    <AdminPageShell icon="settings" title="Admin Settings">
      <AdminHubGrid>
        <Link href="/dashboard/admin/users">
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-primary">
                  people
                </span>
                <CardTitle>User Management</CardTitle>
              </div>
              <CardDescription>
                Manage user roles and permissions
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/admin/company">
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-primary">
                  business
                </span>
                <CardTitle>Company Information</CardTitle>
              </div>
              <CardDescription>
                Update company details for invoices
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/admin/charge-types">
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-primary">
                  list
                </span>
                <CardTitle>Charge Types</CardTitle>
              </div>
              <CardDescription>
                Manage charge types for invoices
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/admin/vendors">
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-primary">
                  store
                </span>
                <CardTitle>Vendors</CardTitle>
              </div>
              <CardDescription>
                Manage vendors for cost invoices
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/admin/customers">
          <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-primary">
                  contacts
                </span>
                <CardTitle>Customer Database</CardTitle>
              </div>
              <CardDescription>
                View and manage all customer information
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </AdminHubGrid>
    </AdminPageShell>
  );
}
