import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { ChargeTypesList } from "@/components/ChargeTypesList";

export default async function ChargeTypesPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Charge Types
        </h1>
        <p className="text-muted-foreground">
          Manage charge types for customer invoices
        </p>
      </div>

      <ChargeTypesList />
    </div>
  );
}
