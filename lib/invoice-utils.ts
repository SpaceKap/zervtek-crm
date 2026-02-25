import { prisma } from "@/lib/prisma";
import {
  getInvoiceTotalWithTax,
  isAmountPaidInFull,
  hasPartialPayment,
} from "./invoice-totals";

/** Re-export for convenience */
export { isChargeSubtracting } from "./charge-utils";
export {
  getInvoiceTotalWithTax,
  isAmountPaidInFull,
  hasPartialPayment,
} from "./invoice-totals";

/**
 * Recalculate and update invoice payment status from its incoming transactions.
 * Call after charges are added/updated/deleted so payment status stays in sync.
 */
export async function recalcInvoicePaymentStatus(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      charges: { include: { chargeType: { select: { name: true } } } },
    },
  });
  if (!invoice) return;

  const totalAmount = getInvoiceTotalWithTax(invoice);
  const transactions = await prisma.transaction.findMany({
    where: { invoiceId, direction: "INCOMING" },
  });
  const totalReceived = transactions.reduce(
    (sum, t) => sum + parseFloat(String(t.amount ?? 0)),
    0
  );

  let paymentStatus: "PENDING" | "PAID" | "PARTIALLY_PAID" = "PENDING";
  if (isAmountPaidInFull(totalReceived, totalAmount)) paymentStatus = "PAID";
  else if (hasPartialPayment(totalReceived)) paymentStatus = "PARTIALLY_PAID";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paymentStatus,
      paidAt: paymentStatus === "PAID" ? new Date() : null,
    },
  });
}
