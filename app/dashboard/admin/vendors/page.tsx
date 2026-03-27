import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { VendorsList } from "@/components/VendorsList";
import { AdminPageShell } from "@/components/AdminPageShell";

export default async function VendorsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  await requireAdmin();

  return (
    <AdminPageShell icon="store" title="Vendors" backHref="/dashboard/admin">
      <VendorsList />
    </AdminPageShell>
  );
}
