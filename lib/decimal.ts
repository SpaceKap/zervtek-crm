import { Decimal } from "@prisma/client/runtime/library";

/**
 * True for Prisma Decimal / decimal.js values.
 * Prefer `Decimal.isDecimal` over `instanceof` when multiple bundle copies exist.
 */
function isDecimalValue(value: unknown): value is Decimal {
  return value != null && Decimal.isDecimal(value);
}

/**
 * Converts a Prisma Decimal to a number
 */
export function decimalToNumber(value: Decimal | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return parseFloat(value.toString());
}

/**
 * Recursively converts all Decimal values in an object to numbers
 */
export function convertDecimalsToNumbers<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "bigint") {
    return Number(obj) as T;
  }

  if (isDecimalValue(obj)) {
    return parseFloat(obj.toString()) as T;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(convertDecimalsToNumbers) as T;
  }

  // Preserve Date objects (convert to ISO string for JSON safety)
  if (obj instanceof Date) {
    return obj.toISOString() as T;
  }

  // Handle objects
  if (typeof obj === "object") {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "bigint") {
        converted[key] = Number(value);
      } else if (isDecimalValue(value)) {
        converted[key] = parseFloat(value.toString());
      } else if (Array.isArray(value)) {
        converted[key] = value.map(convertDecimalsToNumbers);
      } else if (value && typeof value === "object") {
        converted[key] = convertDecimalsToNumbers(value);
      } else {
        converted[key] = value;
      }
    }
    return converted as T;
  }

  return obj;
}
