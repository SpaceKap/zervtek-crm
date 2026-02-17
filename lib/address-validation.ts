/**
 * Postal code validation patterns by country.
 * Keys match country names from COUNTRIES_DATA / getCountriesSorted.
 */
export const POSTAL_CODE_PATTERNS: Record<string, RegExp> = {
  "United States": /^\d{5}(-\d{4})?$/,
  "United States Minor Outlying Islands": /^\d{5}(-\d{4})?$/,
  Canada: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/i,
  "United Kingdom": /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
  Australia: /^\d{4}$/,
  Germany: /^\d{5}$/,
  Japan: /^\d{3}-\d{4}$/,
  India: /^\d{6}$/,
  China: /^\d{6}$/,
  "Hong Kong": /^\d{5}$/,
  Brazil: /^\d{5}-?\d{3}$/,
  Mexico: /^\d{5}$/,
  France: /^\d{5}$/,
  Italy: /^\d{5}$/,
  Spain: /^\d{5}$/,
  Netherlands: /^\d{4} ?[A-Za-z]{2}$/i,
  Belgium: /^\d{4}$/,
  Switzerland: /^\d{4}$/,
  Austria: /^\d{4}$/,
  "South Korea": /^\d{5}$/,
  "New Zealand": /^\d{4}$/,
  Singapore: /^\d{6}$/,
  "South Africa": /^\d{4}$/,
  Ireland: /^[A-Z\d]{3} ?[A-Z\d]{4}$/i,
  Poland: /^\d{2}-\d{3}$/,
  Sweden: /^\d{3} ?\d{2}$/,
  Norway: /^\d{4}$/,
  Denmark: /^\d{4}$/,
  Finland: /^\d{5}$/,
  "Czech Republic": /^\d{3} ?\d{2}$/,
  Czechia: /^\d{3} ?\d{2}$/,
  "Sri Lanka": /^\d{5}$/,
  Portugal: /^\d{4}-?\d{3}$/,
  Greece: /^\d{3} ?\d{2}$/,
  Hungary: /^\d{4}$/,
  Romania: /^\d{6}$/,
  Croatia: /^\d{5}$/,
  Moldova: /^MD-?\d{4}$/i,
  Ukraine: /^\d{5}$/,
  Russia: /^\d{6}$/,
  Thailand: /^\d{5}$/,
  Malaysia: /^\d{5}$/,
  Indonesia: /^\d{5}$/,
  Philippines: /^\d{4}$/,
  Vietnam: /^\d{6}$/,
  "Viet Nam": /^\d{6}$/,
  "Saudi Arabia": /^\d{5}(-\d{4})?$/,
  "United Arab Emirates": /^(?!00000)\d{5}$/,
  Israel: /^\d{7}$/,
  Egypt: /^\d{5}$/,
  Turkey: /^\d{5}$/,
  Pakistan: /^\d{5}$/,
  Bangladesh: /^\d{4}$/,
  Nigeria: /^\d{6}$/,
  Kenya: /^\d{5}$/,
  Ghana: /^[A-Za-z]{2}\d{4}$/,
  Argentina: /^[A-Z]?\d{4}[A-Z]{0,3}$/i,
  Chile: /^\d{7}$/,
  Colombia: /^\d{6}$/,
  Peru: /^\d{5}$/,
  Venezuela: /^\d{4}$/,
  Ecuador: /^\d{6}$/,
};

/**
 * Minimum length for postal code (for countries without specific pattern).
 * Used when country is not in POSTAL_CODE_PATTERNS.
 */
export const DEFAULT_POSTAL_MIN_LENGTH = 3;
export const DEFAULT_POSTAL_MAX_LENGTH = 15;

import { getRegionsForCountry } from "./address-data";

/** Get regions for state validation (countries with predefined regions) */
export function getRegionsForValidation(country: string): string[] {
  return getRegionsForCountry(country);
}

export function validatePostalCode(
  zip: string,
  country: string
): { valid: boolean; message?: string } {
  const trimmed = (zip || "").trim();
  if (!trimmed) {
    return { valid: false, message: "ZIP/Postal code is required" };
  }

  const pattern = POSTAL_CODE_PATTERNS[country];
  if (pattern) {
    if (!pattern.test(trimmed)) {
      return {
        valid: false,
        message: getPostalFormatHint(country),
      };
    }
    return { valid: true };
  }

  // No specific pattern - validate length and basic charset
  if (trimmed.length < DEFAULT_POSTAL_MIN_LENGTH) {
    return {
      valid: false,
      message: `Postal code must be at least ${DEFAULT_POSTAL_MIN_LENGTH} characters`,
    };
  }
  if (trimmed.length > DEFAULT_POSTAL_MAX_LENGTH) {
    return {
      valid: false,
      message: `Postal code must be at most ${DEFAULT_POSTAL_MAX_LENGTH} characters`,
    };
  }
  return { valid: true };
}

export function getPostalFormatHint(country: string): string {
  const hints: Record<string, string> = {
    "United States": "Use format: 12345 or 12345-6789",
    Canada: "Use format: A1A 1A1",
    "United Kingdom": "Use format: SW1A 1AA",
    Australia: "Use 4-digit postcode",
    Germany: "Use 5-digit postal code",
    Japan: "Use format: 123-4567",
    India: "Use 6-digit PIN code",
    China: "Use 6-digit postal code",
    Brazil: "Use format: 12345-678",
    Mexico: "Use 5-digit postal code",
    Czechia: "Use format: 110 00",
    "Czech Republic": "Use format: 110 00",
    "Sri Lanka": "Use 5-digit postal code",
    Vietnam: "Use 6-digit postal code",
    "Viet Nam": "Use 6-digit postal code",
  };
  return hints[country] || "Invalid postal code format for this country";
}

/** Short placeholder for zip input by country */
export function getPostalPlaceholder(country: string): string {
  const placeholders: Record<string, string> = {
    "United States": "12345 or 12345-6789",
    Canada: "A1A 1A1",
    "United Kingdom": "SW1A 1AA",
    Australia: "2000",
    Germany: "10115",
    Japan: "123-4567",
    India: "110001",
    China: "100000",
    Brazil: "01310-100",
    Mexico: "06600",
    Czechia: "110 00",
    "Czech Republic": "110 00",
    "Sri Lanka": "10100",
    "Viet Nam": "100000",
    Vietnam: "100000",
  };
  return placeholders[country] || "ZIP/Postal code";
}

export function validateStateForCountry(
  state: string,
  country: string
): { valid: boolean; message?: string } {
  const trimmed = (state || "").trim();
  if (!trimmed) {
    return { valid: false, message: "State/Province/Region is required" };
  }

  const regions = getRegionsForValidation(country);
  if (regions.length > 0) {
    const match = regions.find(
      (r) => r.toLowerCase() === trimmed.toLowerCase()
    );
    if (!match) {
      return {
        valid: false,
        message: `Please select a valid state/province/region for ${country}`,
      };
    }
    return { valid: true };
  }

  // Free text - basic length validation
  if (trimmed.length < 2) {
    return {
      valid: false,
      message: "State/Province/Region must be at least 2 characters",
    };
  }
  return { valid: true };
}
