import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canManageUsers } from "@/lib/permissions";
import { UserManagement } from "@/components/UserManagement";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminPage() {
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
          Admin Settings
        </h1>
        <p className="text-muted-foreground">
          Manage system settings and configurations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </div>
    </div>
  );
}
