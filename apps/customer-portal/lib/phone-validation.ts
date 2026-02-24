/**
 * Phone number validation by country code.
 * Validates format and length for common country codes.
 */

const PHONE_NUMBER_REGEX = /^[\d\s\-().+]+$/;

/** Min digits (excluding spaces/dashes) for validation when no country-specific rule */
const DEFAULT_MIN_DIGITS = 6;
const DEFAULT_MAX_DIGITS = 15;

/** Country code -> { minDigits, maxDigits, pattern? } */
const PHONE_RULES: Record<string, { minDigits: number; maxDigits: number; pattern?: RegExp }> = {
  "+1": { minDigits: 10, maxDigits: 11, pattern: /^\d{10}$/ }, // US, Canada, etc.
  "+44": { minDigits: 10, maxDigits: 11, pattern: /^\d{10,11}$/ }, // UK
  "+81": { minDigits: 9, maxDigits: 11, pattern: /^\d{9,11}$/ }, // Japan
  "+86": { minDigits: 10, maxDigits: 11, pattern: /^\d{10,11}$/ }, // China
  "+91": { minDigits: 10, maxDigits: 10, pattern: /^\d{10}$/ }, // India
  "+49": { minDigits: 10, maxDigits: 12, pattern: /^\d{10,12}$/ }, // Germany
  "+33": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // France
  "+39": { minDigits: 9, maxDigits: 12, pattern: /^\d{9,12}$/ }, // Italy
  "+34": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Spain
  "+61": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Australia
  "+55": { minDigits: 10, maxDigits: 11, pattern: /^\d{10,11}$/ }, // Brazil
  "+52": { minDigits: 10, maxDigits: 10, pattern: /^\d{10}$/ }, // Mexico
  "+82": { minDigits: 9, maxDigits: 10, pattern: /^\d{9,10}$/ }, // South Korea
  "+65": { minDigits: 8, maxDigits: 8, pattern: /^\d{8}$/ }, // Singapore
  "+971": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // UAE
  "+966": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Saudi Arabia
  "+972": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Israel
  "+20": { minDigits: 9, maxDigits: 10, pattern: /^\d{9,10}$/ }, // Egypt
  "+90": { minDigits: 10, maxDigits: 10, pattern: /^\d{10}$/ }, // Turkey
  "+92": { minDigits: 10, maxDigits: 11, pattern: /^\d{10,11}$/ }, // Pakistan
  "+880": { minDigits: 10, maxDigits: 11, pattern: /^\d{10,11}$/ }, // Bangladesh
  "+62": { minDigits: 9, maxDigits: 12, pattern: /^\d{9,12}$/ }, // Indonesia
  "+60": { minDigits: 9, maxDigits: 10, pattern: /^\d{9,10}$/ }, // Malaysia
  "+63": { minDigits: 10, maxDigits: 10, pattern: /^\d{10}$/ }, // Philippines
  "+84": { minDigits: 9, maxDigits: 10, pattern: /^\d{9,10}$/ }, // Vietnam
  "+353": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Ireland
  "+31": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Netherlands
  "+32": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Belgium
  "+41": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Switzerland
  "+43": { minDigits: 10, maxDigits: 13, pattern: /^\d{10,13}$/ }, // Austria
  "+48": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Poland
  "+46": { minDigits: 9, maxDigits: 10, pattern: /^\d{9,10}$/ }, // Sweden
  "+47": { minDigits: 8, maxDigits: 8, pattern: /^\d{8}$/ }, // Norway
  "+45": { minDigits: 8, maxDigits: 8, pattern: /^\d{8}$/ }, // Denmark
  "+358": { minDigits: 9, maxDigits: 10, pattern: /^\d{9,10}$/ }, // Finland
  "+420": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Czech Republic
  "+351": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Portugal
  "+27": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // South Africa
  "+234": { minDigits: 10, maxDigits: 11, pattern: /^\d{10,11}$/ }, // Nigeria
  "+254": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Kenya
  "+233": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Ghana
  "+54": { minDigits: 10, maxDigits: 11, pattern: /^\d{10,11}$/ }, // Argentina
  "+56": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Chile
  "+57": { minDigits: 10, maxDigits: 10, pattern: /^\d{10}$/ }, // Colombia
  "+51": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Peru
  "+58": { minDigits: 10, maxDigits: 11, pattern: /^\d{10,11}$/ }, // Venezuela
  "+593": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Ecuador
  "+373": { minDigits: 8, maxDigits: 8, pattern: /^\d{8}$/ }, // Moldova
  "+94": { minDigits: 9, maxDigits: 9, pattern: /^\d{9}$/ }, // Sri Lanka
};

function getDigitsOnly(str: string): string {
  return (str || "").replace(/\D/g, "");
}

export function validatePhoneNumber(
  phoneNumber: string,
  countryCode: string
): { valid: boolean; message?: string } {
  const trimmed = (phoneNumber || "").trim();
  if (!trimmed) {
    return { valid: false, message: "Phone number is required" };
  }

  if (!PHONE_NUMBER_REGEX.test(trimmed)) {
    return {
      valid: false,
      message: "Phone number can only contain digits, spaces, hyphens, parentheses, and +",
    };
  }

  const digits = getDigitsOnly(trimmed);
  if (digits.length === 0) {
    return { valid: false, message: "Phone number must contain digits" };
  }

  const rule = PHONE_RULES[countryCode];
  if (rule) {
    if (digits.length < rule.minDigits) {
      return {
        valid: false,
        message: `Phone number must have at least ${rule.minDigits} digits for ${countryCode}`,
      };
    }
    if (digits.length > rule.maxDigits) {
      return {
        valid: false,
        message: `Phone number must have at most ${rule.maxDigits} digits for ${countryCode}`,
      };
    }
    if (rule.pattern && !rule.pattern.test(digits)) {
      return {
        valid: false,
        message: `Invalid phone number format for ${countryCode}`,
      };
    }
    return { valid: true };
  }

  // Generic validation for unlisted country codes
  if (digits.length < DEFAULT_MIN_DIGITS) {
    return {
      valid: false,
      message: `Phone number must have at least ${DEFAULT_MIN_DIGITS} digits`,
    };
  }
  if (digits.length > DEFAULT_MAX_DIGITS) {
    return {
      valid: false,
      message: `Phone number must have at most ${DEFAULT_MAX_DIGITS} digits`,
    };
  }
  return { valid: true };
}
