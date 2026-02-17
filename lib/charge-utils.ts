/** Charge types that subtract from the total (discounts, deposits) */
const SUBTRACTING_TYPES = ["discount", "deposit"];

/** Returns true if this charge type subtracts from the total */
export function isChargeSubtracting(charge: {
  chargeType?: string | { name?: string } | null;
}): boolean {
  const name =
    typeof charge.chargeType === "string"
      ? charge.chargeType
      : charge.chargeType?.name;
  return SUBTRACTING_TYPES.includes((name || "").toLowerCase());
}

/**
 * Sum of charge amounts: positive for normal charges, negative for discount/deposit.
 * Use for subtotal before tax.
 */
export function getChargesSubtotal(charges: Array<{
  amount: unknown;
  chargeType?: string | { name?: string } | null;
}>): number {
  return charges.reduce((sum, charge) => {
    const amount = parseFloat(String(charge.amount ?? 0));
    return isChargeSubtracting(charge) ? sum - amount : sum + amount;
  }, 0);
}

/** Get discount total (positive number) from charges */
export function getDiscountTotal(charges: Array<{
  amount: unknown;
  chargeType?: string | { name?: string } | null;
}>): number {
  return charges
    .filter((c) => (typeof c.chargeType === "string" ? c.chargeType : c.chargeType?.name || "").toLowerCase() === "discount")
    .reduce((sum, c) => sum + parseFloat(String(c.amount ?? 0)), 0);
}

/** Get deposit total (positive number) from charges */
export function getDepositTotal(charges: Array<{
  amount: unknown;
  chargeType?: string | { name?: string } | null;
}>): number {
  return charges
    .filter((c) => (typeof c.chargeType === "string" ? c.chargeType : c.chargeType?.name || "").toLowerCase() === "deposit")
    .reduce((sum, c) => sum + parseFloat(String(c.amount ?? 0)), 0);
}
