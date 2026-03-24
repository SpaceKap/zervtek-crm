"use client";

import { useState } from "react";
import Link from "next/link";
import {
  getPositiveChargesSubtotal,
  getDiscountTotal,
  getDepositTotal,
} from "@/lib/charge-utils";
import { format, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PaymentStatus } from "@prisma/client";

interface PublicInvoiceViewProps {
  invoice: any;
  companyInfo: any;
  /** When set (e.g. dashboard), customer name is a link to this href */
  customerLinkHref?: string;
  /** When true (e.g. dashboard only), show port of destination under Ship To */
  showPortOfDestinationUnderShipping?: boolean;
  /** When true (e.g. dashboard), hide the payment section so sidebar shows it */
  hidePaymentSection?: boolean;
  /** Override for port of destination (e.g. vehicle booking POD); falls back to customer.portOfDestination */
  effectivePortOfDestination?: string | null;
}

const paymentStatusColors: Record<PaymentStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PAID: "bg-green-100 text-green-800 border-green-200",
  PARTIALLY_PAID: "bg-blue-100 text-blue-800 border-blue-200",
  OVERDUE: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Pending Payment",
  PAID: "Paid",
  PARTIALLY_PAID: "Partially Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

function safeJsonParse<T>(raw: unknown): T | null {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeFormatDate(
  value: unknown,
  dateFormat: string,
  fallback = "—",
): string {
  if (value == null || value === "") return fallback;
  const d =
    value instanceof Date ? value : new Date(value as string | number);
  return isValid(d) ? format(d, dateFormat) : fallback;
}

export function PublicInvoiceView({
  invoice,
  companyInfo,
  customerLinkHref,
  showPortOfDestinationUnderShipping = false,
  hidePaymentSection = false,
  effectivePortOfDestination,
}: PublicInvoiceViewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Parse bank details if they're strings (JSON); invalid JSON must not crash the page
  const bankDetails1Raw = companyInfo?.bankDetails1;
  const bankDetails1 =
    bankDetails1Raw &&
    (typeof bankDetails1Raw === "string"
      ? safeJsonParse<Record<string, string>>(bankDetails1Raw)
      : bankDetails1Raw);

  const handleCopy = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const renderBankDetail = (
    label: string,
    value: string,
    fieldId: string,
    isMono: boolean = false,
  ) => {
    if (!value) return null;
    const isCopied = copiedField === fieldId;
    return (
      <div className="flex items-center justify-between group">
        <div className="flex-1">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {label}:
          </span>{" "}
          <span
            className={`text-gray-900 dark:text-white ${
              isMono ? "font-mono" : ""
            } select-all`}
          >
            {value}
          </span>
        </div>
        <button
          onClick={() => handleCopy(value, fieldId)}
          className={`ml-2 p-1.5 rounded transition-all ${
            isCopied
              ? "bg-green-100 dark:bg-green-900/30"
              : "hover:bg-gray-200 dark:hover:bg-gray-700 opacity-60 hover:opacity-100"
          }`}
          title="Copy to clipboard"
          aria-label={`Copy ${label}`}
        >
          <span
            className={`material-symbols-outlined text-sm ${
              isCopied
                ? "text-green-600 dark:text-green-400"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {isCopied ? "check" : "content_copy"}
          </span>
        </button>
      </div>
    );
  };

  const formatCompanyAddress = (address: any) => {
    if (!address) return [];
    const obj =
      typeof address === "string" ? safeJsonParse<Record<string, string>>(address) : address;
    if (!obj || typeof obj !== "object") return [];
    const lines: string[] = [];
    if (obj.street) lines.push(obj.street);
    if (obj.city || obj.state || obj.zip) {
      const cityStateZip = [obj.city, obj.state, obj.zip]
        .filter(Boolean)
        .join(", ");
      if (cityStateZip) lines.push(cityStateZip);
    }
    if (obj.country) lines.push(obj.country);
    return lines;
  };

  const formatCustomerAddress = (address: any) => {
    const lines: string[] = [];
    if (address) {
      const addr =
        typeof address === "string"
          ? safeJsonParse<Record<string, string>>(address)
          : address;
      if (!addr || typeof addr !== "object") return lines;
      if (addr.street) lines.push(addr.street);
      if (addr.apartment) lines.push(addr.apartment);
      if (addr.city || addr.state || addr.zip) {
        const cityStateZip = [addr.city, addr.state, addr.zip]
          .filter(Boolean)
          .join(", ");
        if (cityStateZip) lines.push(cityStateZip);
      }
      if (addr.country) lines.push(addr.country);
    }
    return lines;
  };

  const companyAddressLines = companyInfo?.address
    ? formatCompanyAddress(companyInfo.address)
    : [];
  const customer = invoice?.customer;
  const billingAddress = customer?.billingAddress
    ? typeof customer.billingAddress === "string"
      ? safeJsonParse(customer.billingAddress) ?? null
      : customer.billingAddress
    : null;
  const shippingAddress = customer?.shippingAddress
    ? typeof customer.shippingAddress === "string"
      ? safeJsonParse(customer.shippingAddress) ?? null
      : customer.shippingAddress
    : null;
  const billingAddressLines = formatCustomerAddress(billingAddress);
  const shippingAddressLines = formatCustomerAddress(shippingAddress);

  // Subtotal (positive only) → Discount → Deposit → Tax → Total (same as PDF)
  const chargesList = invoice?.charges ?? [];
  const subtotalPositive = getPositiveChargesSubtotal(chargesList);
  const discountTotal = getDiscountTotal(chargesList);
  const depositTotal = getDepositTotal(chargesList);
  const afterDeposit = subtotalPositive - discountTotal - depositTotal;
  // Line items: only positive charges; discount/deposit appear only in footer after subtotal
  const lineItemCharges = chargesList.filter((charge: any) => {
    const name = (typeof charge.chargeType === "string" ? charge.chargeType : charge.chargeType?.name ?? "").toString().toLowerCase();
    return name !== "discount" && name !== "deposit";
  });
  let taxAmount = 0;
  if (invoice.taxEnabled && invoice.taxRate) {
    const taxRate = parseFloat(invoice.taxRate.toString());
    taxAmount = afterDeposit * (taxRate / 100);
  }
  const recycleFee = invoice.taxEnabled ? taxAmount : 0;
  const total = afterDeposit + taxAmount + recycleFee;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1E1E1E] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-[#1E1E1E] dark:border-[#2C2C2C] rounded-lg border shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            {/* Company Info */}
            <div className="flex-1">
              {companyInfo?.logo && (
                <div className="mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={companyInfo.logo}
                    alt={companyInfo.name || "Company Logo"}
                    className="h-12 object-contain"
                  />
                </div>
              )}
              {companyInfo?.name && (
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {companyInfo.name}
                </h1>
              )}
              {companyAddressLines.length > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {companyAddressLines.map((line: string, idx: number) => (
                    <p key={idx}>{line}</p>
                  ))}
                </div>
              )}
              {companyInfo?.phone && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Phone: {companyInfo.phone}
                </p>
              )}
              {companyInfo?.email && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Email: {companyInfo.email}
                </p>
              )}
            </div>

            {/* Invoice Title */}
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                INVOICE
              </h2>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Bill To (left) | Ship To (center) | Invoice details (right), balanced spacing */}
          <div className="grid grid-cols-3 gap-6">
            {/* Bill To - left */}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">
                Bill To
              </h3>
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1 break-words">
                {customerLinkHref ? (
                  <p className="font-semibold">
                    <Link
                      href={customerLinkHref}
                      className="text-primary hover:underline"
                    >
                      {customer?.name ?? "N/A"}
                    </Link>
                  </p>
                ) : (
                  <p className="font-semibold">
                    {customer?.name ?? "N/A"}
                  </p>
                )}
                {billingAddressLines.length > 0 && (
                  <>
                    {billingAddressLines.map((line: string, idx: number) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </>
                )}
                {customer?.email && <p>{customer.email}</p>}
                {customer?.phone && <p>{customer.phone}</p>}
              </div>
            </div>

            {/* Ship To - center */}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">
                Ship To
              </h3>
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1 break-words">
                {customerLinkHref ? (
                  <p className="font-semibold">
                    <Link
                      href={customerLinkHref}
                      className="text-primary hover:underline"
                    >
                      {customer?.name ?? "N/A"}
                    </Link>
                  </p>
                ) : (
                  <p className="font-semibold">
                    {customer?.name ?? "N/A"}
                  </p>
                )}
                {shippingAddressLines.length > 0 ? (
                  <>
                    {shippingAddressLines.map((line: string, idx: number) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </>
                ) : billingAddressLines.length > 0 ? (
                  <>
                    {billingAddressLines.map((line: string, idx: number) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </>
                ) : null}
                {customer?.email && <p>{customer.email}</p>}
                {customer?.phone && <p>{customer.phone}</p>}
                {showPortOfDestinationUnderShipping &&
                  (effectivePortOfDestination ?? customer?.portOfDestination) && (
                    <p className="pt-1 font-medium">
                      Port of destination:{" "}
                      {effectivePortOfDestination ?? customer?.portOfDestination}
                    </p>
                  )}
              </div>
            </div>

            {/* Invoice Details - right, label and value close together */}
            <div className="min-w-0 flex justify-end">
              <div className="text-sm w-full max-w-[220px]">
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 items-baseline">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 uppercase whitespace-nowrap">
                    INVOICE
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white uppercase text-right">
                    {invoice.invoiceNumber}
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300 uppercase whitespace-nowrap">
                    DATE
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-right">
                    {safeFormatDate(invoice.issueDate, "yyyy/MM/dd")}
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300 uppercase whitespace-nowrap">
                    TERMS
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-right">
                    {invoice.dueDate
                      ? (() => {
                          const issue =
                            typeof invoice.issueDate === "string"
                              ? new Date(invoice.issueDate)
                              : invoice.issueDate instanceof Date
                                ? invoice.issueDate
                                : new Date(invoice.issueDate);
                          const due =
                            typeof invoice.dueDate === "string"
                              ? new Date(invoice.dueDate)
                              : invoice.dueDate instanceof Date
                                ? invoice.dueDate
                                : new Date(invoice.dueDate);
                          if (!isValid(issue) || !isValid(due)) return "Net 3";
                          const diffTime = due.getTime() - issue.getTime();
                          const diffDays = Math.ceil(
                            diffTime / (1000 * 60 * 60 * 24),
                          );
                          return `Net ${Number.isFinite(diffDays) ? diffDays : 3}`;
                        })()
                      : "Net 3"}
                  </span>
                  {invoice.dueDate && (
                    <>
                      <span className="font-semibold text-gray-700 dark:text-gray-300 uppercase whitespace-nowrap">
                        DUE DATE
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white text-right">
                        {safeFormatDate(invoice.dueDate, "yyyy/MM/dd")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <Card className="mb-6 dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-white">
              Invoice Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#2C2C2C]">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Description
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-32">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItemCharges.map((charge: any) => {
                    const raw = charge?.amount;
                    const parsed =
                      raw == null
                        ? NaN
                        : typeof raw === "number"
                          ? raw
                          : parseFloat(String(raw));
                    const amount = Number.isFinite(parsed) ? parsed : 0;
                    const currencySymbol = "¥";
                    const formatted = `${currencySymbol}${amount.toLocaleString()}`;
                    return (
                      <tr
                        key={charge.id}
                        className="border-b border-gray-100 dark:border-[#2C2C2C]/50"
                      >
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {charge.description}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right w-32">
                          <p className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                            {formatted}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-b border-gray-300 dark:border-gray-600">
                    <td className="py-2.5 px-4 text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">Subtotal</p>
                    </td>
                    <td className="py-2.5 px-4 text-right w-32">
                      <p className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        ¥{subtotalPositive.toLocaleString()}
                      </p>
                    </td>
                  </tr>
                  {discountTotal > 0 && (
                    <tr>
                      <td className="py-2 px-4 text-right">
                        <p className="text-gray-700 dark:text-gray-300">Discount</p>
                      </td>
                      <td className="py-2 px-4 text-right w-32">
                        <p className="text-red-600 dark:text-red-400 whitespace-nowrap">
                          -¥{discountTotal.toLocaleString()}
                        </p>
                      </td>
                    </tr>
                  )}
                  {depositTotal > 0 && (
                    <tr>
                      <td className="py-2 px-4 text-right">
                        <p className="text-gray-700 dark:text-gray-300">Deposit</p>
                      </td>
                      <td className="py-2 px-4 text-right w-32">
                        <p className="text-red-600 dark:text-red-400 whitespace-nowrap">
                          -¥{depositTotal.toLocaleString()}
                        </p>
                      </td>
                    </tr>
                  )}
                  {invoice.taxEnabled && taxAmount > 0 && (
                    <tr>
                      <td className="py-2 px-4 text-right">
                        <p className="text-gray-700 dark:text-gray-300">
                          Japanese Consumption Tax ({invoice.taxRate}%)
                        </p>
                      </td>
                      <td className="py-2 px-4 text-right w-32">
                        <p className="text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          ¥{taxAmount.toLocaleString()}
                        </p>
                      </td>
                    </tr>
                  )}
                  {invoice.taxEnabled && recycleFee > 0 && (
                    <tr>
                      <td className="py-2 px-4 text-right">
                        <p className="text-gray-700 dark:text-gray-300">
                          Recycle Fee
                        </p>
                      </td>
                      <td className="py-2 px-4 text-right w-32">
                        <p className="text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          ¥{recycleFee.toLocaleString()}
                        </p>
                      </td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <td className="py-4 px-4 text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        Total
                      </p>
                    </td>
                    <td className="py-4 px-4 text-right w-32">
                      <p className="text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        ¥{total.toLocaleString()}
                      </p>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Payment Section (hidden on dashboard; sidebar shows payment info) */}
        {!hidePaymentSection &&
          invoice.paymentStatus !== PaymentStatus.PAID && (
          <Card className="mb-6 dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 dark:text-white">
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Wise Payment Link */}
              {invoice.wisePaymentLink && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Pay Securely with Wise
                  </p>
                  <a
                    href={(() => {
                      try {
                        // Construct Wise payment link with dynamic parameters
                        const baseUrl = invoice.wisePaymentLink.split("?")[0]; // Remove existing query params
                        const params = new URLSearchParams();

                        // Add amount (convert JPY to USD if needed, or use JPY)
                        params.append("amount", total.toFixed(2));
                        params.append("currency", "JPY"); // Change to your preferred currency
                        params.append(
                          "description",
                          `Invoice ${invoice.invoiceNumber}`,
                        );

                        // Preserve existing utm_source if present
                        try {
                          const existingUrl = new URL(invoice.wisePaymentLink);
                          const utmSource =
                            existingUrl.searchParams.get("utm_source");
                          if (utmSource) {
                            params.append("utm_source", utmSource);
                          }
                        } catch (e) {
                          // If URL parsing fails, try to extract utm_source manually
                          const utmMatch =
                            invoice.wisePaymentLink.match(/utm_source=([^&]+)/);
                          if (utmMatch) {
                            params.append("utm_source", utmMatch[1]);
                          }
                        }

                        return `${baseUrl}?${params.toString()}`;
                      } catch (error) {
                        // Fallback to original link if construction fails
                        return invoice.wisePaymentLink;
                      }
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#00B9FF] hover:bg-[#0099CC] text-white font-semibold rounded-lg transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    Pay with Wise
                  </a>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Amount: ¥{total.toLocaleString()}
                  </p>
                </div>
              )}

              {/* Bank Details */}
              {bankDetails1 && (
                <div className="space-y-4">
                  {invoice.wisePaymentLink && <Separator />}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                      Bank Transfer Details
                    </p>
                    <div className="grid gap-6">
                      {/* Bank Account 1 */}
                      {bankDetails1 && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Sumitomo Mitsui Banking Corporation (三井住友銀行)
                          </h4>
                          <div className="space-y-2 text-sm">
                            {renderBankDetail(
                              "Bank Name",
                              bankDetails1.name,
                              "bank1-name",
                            )}
                            {renderBankDetail(
                              "Account Name",
                              bankDetails1.accountName,
                              "bank1-accountName",
                            )}
                            {renderBankDetail(
                              "Account Number",
                              bankDetails1.accountNo,
                              "bank1-accountNo",
                              true,
                            )}
                            {renderBankDetail(
                              "SWIFT Code",
                              bankDetails1.swiftCode,
                              "bank1-swiftCode",
                              true,
                            )}
                            {renderBankDetail(
                              "Branch",
                              bankDetails1.branchName,
                              "bank1-branchName",
                            )}
                            {renderBankDetail(
                              "Bank Address",
                              bankDetails1.bankAddress,
                              "bank1-bankAddress",
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Fallback if no payment method */}
              {!invoice.wisePaymentLink && !bankDetails1 && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Payment instructions will be provided by the company.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Please contact us for payment details.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {invoice.notes && (
          <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 dark:text-white">
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {invoice.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
