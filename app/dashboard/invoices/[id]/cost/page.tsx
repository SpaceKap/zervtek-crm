import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAuth, canViewAllInquiries } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CostInvoiceEditor } from "@/components/CostInvoiceEditor";

export default async function CostInvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const user = await requireAuth();

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      vehicle: true,
      charges: {
        include: {
          chargeType: true,
        },
        orderBy: { createdAt: "asc" },
      },
      costInvoice: {
        include: {
          costItems: {
            include: {
              vendor: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!invoice) {
    return <div>Invoice not found</div>;
  }

  // Check permissions
  const canViewAll = canViewAllInquiries(user.role);
  if (!canViewAll && invoice.createdById !== user.id) {
    redirect("/dashboard/invoices");
  }

  return <CostInvoiceEditor invoice={invoice} currentUser={user} />;
}
