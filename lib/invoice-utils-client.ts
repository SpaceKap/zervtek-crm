/**
 * Client-safe invoice helpers. Use in "use client" components instead of
 * invoice-utils to avoid pulling in Prisma.
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
