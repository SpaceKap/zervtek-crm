import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAuth, canViewAllInquiries } from "@/lib/permissions";
import { SharedInvoicesList } from "@/components/SharedInvoicesList";
import { UserRole } from "@prisma/client";

export default async function SharedInvoicesPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const user = await requireAuth();

  if (!canViewAllInquiries(user.role)) {
    redirect("/dashboard");
  }

  const isAdmin = user.role === UserRole.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Shared Invoices
          </h1>
          <p className="text-muted-foreground">
            Manage forwarder and container invoices
          </p>
        </div>
        <div id="new-shared-invoice-btn-wrapper"></div>
      </div>

      <SharedInvoicesList isAdmin={isAdmin} />
    </div>
  );
}
