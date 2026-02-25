/**
 * Client-safe enum constants and types. Use these in "use client" components
 * instead of importing from @prisma/client to avoid bundling Prisma in the browser.
 * Values must match the Prisma schema enums.
 */

export const UserRole = {
  SALES: "SALES",
  MANAGER: "MANAGER",
  ADMIN: "ADMIN",
  BACK_OFFICE_STAFF: "BACK_OFFICE_STAFF",
  ACCOUNTANT: "ACCOUNTANT",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const TransactionDirection = {
  INCOMING: "INCOMING",
  OUTGOING: "OUTGOING",
} as const;
export type TransactionDirection =
  (typeof TransactionDirection)[keyof typeof TransactionDirection];

export const TransactionType = {
  BANK_TRANSFER: "BANK_TRANSFER",
  PAYPAL: "PAYPAL",
  CASH: "CASH",
  WISE: "WISE",
} as const;
export type TransactionType =
  (typeof TransactionType)[keyof typeof TransactionType];

export const ShippingStage = {
  PURCHASE: "PURCHASE",
  TRANSPORT: "TRANSPORT",
  REPAIR: "REPAIR",
  DOCUMENTS: "DOCUMENTS",
  BOOKING: "BOOKING",
  SHIPPED: "SHIPPED",
  DHL: "DHL",
} as const;
export type ShippingStage =
  (typeof ShippingStage)[keyof typeof ShippingStage];

export const DocumentCategory = {
  INVOICE: "INVOICE",
  PHOTOS: "PHOTOS",
  EXPORT_CERTIFICATE: "EXPORT_CERTIFICATE",
  DEREGISTRATION_CERTIFICATE: "DEREGISTRATION_CERTIFICATE",
  INSURANCE_REFUND: "INSURANCE_REFUND",
  SHIPPING_INSTRUCTIONS: "SHIPPING_INSTRUCTIONS",
  SHIPPING_ORDER: "SHIPPING_ORDER",
  BILL_OF_LADING: "BILL_OF_LADING",
  LETTER_OF_CREDIT: "LETTER_OF_CREDIT",
  EXPORT_DECLARATION: "EXPORT_DECLARATION",
  RECYCLE_APPLICATION: "RECYCLE_APPLICATION",
  DHL_TRACKING: "DHL_TRACKING",
  RELEASED_BILL_OF_LADING: "RELEASED_BILL_OF_LADING",
  AUCTION_SHEET: "AUCTION_SHEET",
  OTHER: "OTHER",
} as const;
export type DocumentCategory =
  (typeof DocumentCategory)[keyof typeof DocumentCategory];

export const VendorCategory = {
  DEALERSHIP: "DEALERSHIP",
  AUCTION_HOUSE: "AUCTION_HOUSE",
  TRANSPORT_VENDOR: "TRANSPORT_VENDOR",
  GARAGE: "GARAGE",
  FREIGHT_VENDOR: "FREIGHT_VENDOR",
  FORWARDING_VENDOR: "FORWARDING_VENDOR",
  FORWARDER: "FORWARDER",
  SHIPPING_AGENT: "SHIPPING_AGENT",
  YARD: "YARD",
} as const;
export type VendorCategory =
  (typeof VendorCategory)[keyof typeof VendorCategory];
