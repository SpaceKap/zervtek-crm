import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicInvoiceView } from "@/components/PublicInvoiceView";
import { getInvoiceTotalWithTax } from "@/lib/invoice-utils";

export default async function PublicInvoicePage({
  params,
}: {
  params: { token: string };
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { shareToken: params.token },
    include: {
      customer: true,
      vehicle: true,
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
          },
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  // Only show approved or finalized invoices
  if (invoice.status !== "APPROVED" && invoice.status !== "FINALIZED") {
    notFound();
  }

  // Get company info
  const companyInfo = await prisma.companyInfo.findFirst();

  // Invoice total (charges subtotal + tax; deposits/discounts subtract)
  const totalAmount = getInvoiceTotalWithTax(invoice);

  return (
    <PublicInvoiceView
      invoice={{
        ...invoice,
        totalAmount,
      }}
      companyInfo={companyInfo}
    />
  );
}
