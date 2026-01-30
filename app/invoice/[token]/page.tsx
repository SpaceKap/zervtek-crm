import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { PublicInvoiceView } from "@/components/PublicInvoiceView";

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

  // Calculate total amount
  const totalCharges = invoice.charges.reduce(
    (sum, charge) => sum + parseFloat(charge.amount.toString()),
    0,
  );

  let totalAmount = totalCharges;
  if (invoice.taxEnabled && invoice.taxRate) {
    const taxRate = parseFloat(invoice.taxRate.toString());
    const taxAmount = totalCharges * (taxRate / 100);
    totalAmount += taxAmount;
  }

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
