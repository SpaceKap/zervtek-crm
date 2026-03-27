import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { ChargeTypesList } from "@/components/ChargeTypesList";
import { AdminPageShell } from "@/components/AdminPageShell";

export default async function ChargeTypesPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  await requireAdmin();

  return (
    <AdminPageShell
      icon="list"
      title="Charge Types"
      backHref="/dashboard/admin"
    >
      <ChargeTypesList />
    </AdminPageShell>
  );
}
