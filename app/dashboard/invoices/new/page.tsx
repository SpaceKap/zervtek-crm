import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAuth, canCreateInvoice } from "@/lib/permissions";
import { InvoiceForm } from "@/components/InvoiceForm";

export default async function NewInvoicePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const user = await requireAuth();

  if (!canCreateInvoice(user.role)) {
    redirect("/dashboard");
  }

  return <InvoiceForm />;
}
