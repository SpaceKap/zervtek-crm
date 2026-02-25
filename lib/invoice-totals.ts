/**
 * Pure invoice total helpers (no Prisma). Safe to import from Client Components.
 */
import { getChargesSubtotal } from "./charge-utils";

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
