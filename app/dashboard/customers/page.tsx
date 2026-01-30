import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/permissions";
import { CustomersList } from "@/components/CustomersList";

export default async function CustomersPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Customers
        </h1>
        <p className="text-muted-foreground">
          Manage customer information for invoices
        </p>
      </div>

      <CustomersList />
    </div>
  );
}
