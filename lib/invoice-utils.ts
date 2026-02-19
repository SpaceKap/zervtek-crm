import { prisma } from "@/lib/prisma";
import { getChargesSubtotal } from "./charge-utils";

/** Re-export for convenience */
export { isChargeSubtracting } from "./charge-utils";

/**
 * Calculate total invoice amount (charges + tax if enabled).
 * Discounts and deposits are subtracted. Use for payment comparison.
 */
export function getInvoiceTotalWithTax(invoice: {
  charges: Array<{ amount: unknown; chargeType?: string | { name?: string } | null }>;
  taxEnabled?: boolean;
  taxRate?: unknown;
}): number {
  const chargesSubtotal = getChargesSubtotal(invoice.charges);
  if (invoice.taxEnabled && invoice.taxRate != null) {
    const taxRate = parseFloat(String(invoice.taxRate));
    const taxAmount = chargesSubtotal * (taxRate / 100);
    return chargesSubtotal + taxAmount;
  }
  return chargesSubtotal;
}

/** Small tolerance for floating-point comparison (0.01 = 1 cent) */
const TOLERANCE = 0.01;

/** Check if received amount >= total (with floating-point tolerance) */
export function isAmountPaidInFull(totalReceived: number, totalAmount: number): boolean {
  return totalReceived >= totalAmount - TOLERANCE;
}

/** Check if any amount has been received */
export function hasPartialPayment(totalReceived: number): boolean {
  return totalReceived > TOLERANCE;
}

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
