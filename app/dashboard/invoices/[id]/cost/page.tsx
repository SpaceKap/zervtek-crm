import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAuth, canViewAllInquiries } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CostInvoiceEditor } from "@/components/CostInvoiceEditor";
import { ResourceNotFound } from "@/components/ResourceNotFound";

export default async function CostInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const user = await requireAuth();

  const invoice = await prisma.invoice.findUnique({
    where: { id },
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
    return <ResourceNotFound variant="cost-invoice" id={id} />;
  }

  // Check permissions
  const canViewAll = canViewAllInquiries(user.role);
  if (!canViewAll && invoice.createdById !== user.id) {
    redirect("/dashboard/financial-operations");
  }

  return <CostInvoiceEditor invoice={invoice} currentUser={user} />;
}
