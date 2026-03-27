import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { CompanyInfoForm } from "@/components/CompanyInfoForm";
import { AdminPageShell } from "@/components/AdminPageShell";

export default async function CompanyInfoPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  await requireAdmin();

  return (
    <AdminPageShell
      icon="business"
      title="Company Information"
      backHref="/dashboard/admin"
    >
      <CompanyInfoForm />
    </AdminPageShell>
  );
}
