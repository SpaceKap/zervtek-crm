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
import { convertDecimalsToNumbers } from "@/lib/decimal";
import { InvoiceDetail } from "@/components/InvoiceDetail";
import { InvoiceForm } from "@/components/InvoiceForm";
import { ResourceNotFound } from "@/components/ResourceNotFound";

export default async function InvoiceDetailPage(
  props: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ edit?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const user = await requireAuth();

  const invoice = await prisma.invoice.findUnique({
    where: { id: resolvedParams.id },
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
      unlockedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      revertedToDraftBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      editedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      charges: {
        include: {
          chargeType: true,
          appliedDepositTransaction: {
            select: { id: true, date: true, amount: true, description: true, type: true, depositNumber: true },
          },
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
      transactions: {
        where: { direction: "INCOMING" },
        orderBy: { date: "desc" },
      },
    },
  });

  const companyInfo = await prisma.companyInfo.findFirst();

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
    return <ResourceNotFound variant="invoice" id={resolvedParams.id} />;
  }

  // Check permissions
  const canViewAll = canViewAllInquiries(user.role);
  if (!canViewAll && invoice.createdById !== user.id) {
    redirect("/dashboard/financial-operations");
  }

  const canApprove = canApproveInvoice(user.role);
  const canFinalize = canFinalizeInvoice(user.role);
  const canDelete = canDeleteInvoice(user.role);
  const isEditMode = resolvedSearchParams?.edit === "true";

  // Serialize for Client Components (Prisma Decimals are not serializable)
  const serializedInvoice = convertDecimalsToNumbers(invoice);
  const serializedAdditionalVehicles = convertDecimalsToNumbers(additionalVehicles);

  // If in edit mode, show InvoiceForm
  if (isEditMode) {
    return <InvoiceForm invoice={serializedInvoice} />;
  }

  return (
    <div className="min-h-screen">
      <InvoiceDetail
        invoice={serializedInvoice}
        currentUser={user}
        canApprove={canApprove}
        canFinalize={canFinalize}
        canDelete={canDelete}
        additionalVehicles={serializedAdditionalVehicles}
        companyInfo={companyInfo ?? undefined}
      />
    </div>
  );
}
