/** Charge types that subtract from the total (discounts, deposits) */
const SUBTRACTING_TYPES = ["discount", "deposit"];

/** Only discount subtracts from revenue for P&L; deposit is neutral (deposit - deposit) */
const REVENUE_SUBTRACTING_TYPES = ["discount"];

/** Returns true if this charge type subtracts from the total (amount due) */
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
 * Use for invoice total (amount due) and payment comparison.
 * Uses Math.abs for discount/deposit so totals are correct even if stored amount was negative (legacy/data fix).
 */
export function getChargesSubtotal(charges: Array<{
  amount: unknown;
  chargeType?: string | { name?: string } | null;
}>): number {
  return charges.reduce((sum, charge) => {
    const amount = parseFloat(String(charge.amount ?? 0));
    return isChargeSubtracting(charge) ? sum - Math.abs(amount) : sum + amount;
  }, 0);
}

/**
 * Subtotal for revenue in P&L: only discount subtracts; deposit does not.
 * Use for profit, margin, ROI so applied deposit doesn't reduce revenue (deposit - deposit = 0).
 * Uses Math.abs for discount so revenue is correct even if stored amount was negative.
 */
export function getChargesSubtotalForRevenue(charges: Array<{
  amount: unknown;
  chargeType?: string | { name?: string } | null;
}>): number {
  return charges.reduce((sum, charge) => {
    const amount = parseFloat(String(charge.amount ?? 0));
    const name =
      typeof charge.chargeType === "string"
        ? charge.chargeType
        : charge.chargeType?.name;
    const typeLower = (name || "").toLowerCase();
    if (REVENUE_SUBTRACTING_TYPES.includes(typeLower)) return sum - Math.abs(amount);
    if (typeLower === "deposit") return sum; // deposit neutral for revenue
    return sum + amount;
  }, 0);
}

/** Sum of positive charges only (excludes discount and deposit). Use for display "Subtotal" before Discount/Deposit. */
export function getPositiveChargesSubtotal(charges: Array<{
  amount: unknown;
  chargeType?: string | { name?: string } | null;
}>): number {
  return charges.reduce((sum, charge) => {
    const name =
      typeof charge.chargeType === "string"
        ? charge.chargeType
        : charge.chargeType?.name;
    const typeLower = (name || "").toLowerCase();
    if (typeLower === "discount" || typeLower === "deposit") return sum;
    return sum + parseFloat(String(charge.amount ?? 0));
  }, 0);
}

/** Get discount total (positive number) from charges. Uses Math.abs so display is correct even if stored negative. */
export function getDiscountTotal(charges: Array<{
  amount: unknown;
  chargeType?: string | { name?: string } | null;
}>): number {
  return charges
    .filter((c) => (typeof c.chargeType === "string" ? c.chargeType : c.chargeType?.name || "").toLowerCase() === "discount")
    .reduce((sum, c) => sum + Math.abs(parseFloat(String(c.amount ?? 0))), 0);
}

/** Get deposit total (positive number) from charges. Uses Math.abs so display is correct even if stored negative. */
export function getDepositTotal(charges: Array<{
  amount: unknown;
  chargeType?: string | { name?: string } | null;
}>): number {
  return charges
    .filter((c) => (typeof c.chargeType === "string" ? c.chargeType : c.chargeType?.name || "").toLowerCase() === "deposit")
    .reduce((sum, c) => sum + Math.abs(parseFloat(String(c.amount ?? 0))), 0);
}
