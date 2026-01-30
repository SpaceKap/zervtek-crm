import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { CompanyInfoForm } from "@/components/CompanyInfoForm";

export default async function CompanyInfoPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Company Information
        </h1>
        <p className="text-muted-foreground">
          Manage your company details for invoices
        </p>
      </div>

      <CompanyInfoForm />
    </div>
  );
}
