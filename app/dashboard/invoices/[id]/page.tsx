import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  requireAuth,
  canViewAllInquiries,
  canApproveInvoice,
  canFinalizeInvoice,
  canDeleteInvoice,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { InvoiceDetail } from "@/components/InvoiceDetail";
import { InvoiceForm } from "@/components/InvoiceForm";

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { edit?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const user = await requireAuth();

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      vehicle: {
        include: {
          sharedInvoiceVehicles: {
            include: {
              sharedInvoice: true,
            },
          },
          shippingStage: true,
          stageCosts: {
            include: {
              vendor: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      finalizedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      charges: {
        include: {
          chargeType: true,
        },
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

  // Fetch additional vehicles if this is a container invoice
  let additionalVehicles: any[] = [];
  if (
    invoice?.metadata &&
    typeof invoice.metadata === "object" &&
    invoice.metadata !== null
  ) {
    const metadata = invoice.metadata as any;
    if (metadata.isContainerInvoice && Array.isArray(metadata.vehicleIds)) {
      const vehicleIds = metadata.vehicleIds.filter(
        (id: string) => id !== invoice.vehicleId,
      );
      if (vehicleIds.length > 0) {
        additionalVehicles = await prisma.vehicle.findMany({
          where: {
            id: {
              in: vehicleIds,
            },
          },
        });
      }
    }
  }

  if (!invoice) {
    return <div>Invoice not found</div>;
  }

  // Check permissions
  const canViewAll = canViewAllInquiries(user.role);
  if (!canViewAll && invoice.createdById !== user.id) {
    redirect("/dashboard/financial-operations");
  }

  const canApprove = canApproveInvoice(user.role);
  const canFinalize = canFinalizeInvoice(user.role);
  const canDelete = canDeleteInvoice(user.role);
  const isEditMode = searchParams?.edit === "true";

  // If in edit mode, show InvoiceForm
  if (isEditMode) {
    return <InvoiceForm invoice={invoice} />;
  }

  return (
    <div className="min-h-screen">
      <InvoiceDetail
        invoice={invoice}
        currentUser={user}
        canApprove={canApprove}
        canFinalize={canFinalize}
        canDelete={canDelete}
        additionalVehicles={additionalVehicles}
      />
    </div>
  );
}
