import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAuth, canViewAllInquiries } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ContainerInvoiceDetail } from "@/components/ContainerInvoiceDetail";

export default async function ContainerInvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const user = await requireAuth();

  const containerInvoice = await prisma.containerInvoice.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      sharedInvoice: {
        include: {
          vehicles: {
            include: {
              vehicle: true,
            },
          },
        },
      },
      vehicles: {
        include: {
          vehicle: true,
        },
      },
    },
  });

  if (!containerInvoice) {
    return <div>Container invoice not found</div>;
  }

  // Check permissions
  const canViewAll = canViewAllInquiries(user.role);
  if (!canViewAll) {
    const hasAccess = await prisma.invoice.findFirst({
      where: {
        customerId: containerInvoice.customerId,
        createdById: user.id,
      },
    });
    if (!hasAccess) {
      redirect("/dashboard/invoices");
    }
  }

  return (
    <ContainerInvoiceDetail
      containerInvoice={containerInvoice}
      currentUser={user}
    />
  );
}
