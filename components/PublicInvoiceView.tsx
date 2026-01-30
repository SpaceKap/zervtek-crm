"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PaymentStatus } from "@prisma/client";

interface PublicInvoiceViewProps {
  invoice: any;
  companyInfo: any;
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

export function PublicInvoiceView({
  invoice,
  companyInfo,
}: PublicInvoiceViewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Parse bank details if they're strings (JSON)
  const bankDetails1 =
    companyInfo?.bankDetails1 &&
    (typeof companyInfo.bankDetails1 === "string"
      ? JSON.parse(companyInfo.bankDetails1)
      : companyInfo.bankDetails1);
  const bankDetails2 =
    companyInfo?.bankDetails2 &&
    (typeof companyInfo.bankDetails2 === "string"
      ? JSON.parse(companyInfo.bankDetails2)
      : companyInfo.bankDetails2);

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
    const lines = [];
    if (address.street) lines.push(address.street);
    if (address.city || address.state || address.zip) {
      const cityStateZip = [address.city, address.state, address.zip]
        .filter(Boolean)
        .join(", ");
      if (cityStateZip) lines.push(cityStateZip);
    }
    if (address.country) lines.push(address.country);
    return lines;
  };

  const formatCustomerAddress = (customer: any) => {
    const lines = [];
    // Use billingAddress (stored as JSON)
    if (customer.billingAddress) {
      const addr =
        typeof customer.billingAddress === "string"
          ? JSON.parse(customer.billingAddress)
          : customer.billingAddress;
      if (addr.street) lines.push(addr.street);
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
  const customerAddressLines = formatCustomerAddress(invoice.customer);

  const totalCharges = invoice.charges.reduce(
    (sum: number, charge: any) => sum + parseFloat(charge.amount.toString()),
    0,
  );

  let subtotal = totalCharges;
  let taxAmount = 0;
  if (invoice.taxEnabled && invoice.taxRate) {
    const taxRate = parseFloat(invoice.taxRate.toString());
    taxAmount = subtotal * (taxRate / 100);
  }
  const total = subtotal + taxAmount;

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

          {/* Bill To Section with Invoice Details */}
          <div className="flex items-start justify-between gap-6">
            {/* Customer Information */}
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">
                Bill To
              </h3>
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">
                    {invoice.customer.name || "N/A"}
                  </p>
                  {customerAddressLines.length > 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mt-1">
                      {customerAddressLines.map((line: string, idx: number) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  )}
                  {invoice.customer.email && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Email: {invoice.customer.email}
                    </p>
                  )}
                  {invoice.customer.phone && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Phone: {invoice.customer.phone}
                    </p>
                  )}
                </div>
                {/* Invoice Details - Two Column Layout */}
                <div className="flex-shrink-0">
                  <div className="space-y-2 text-sm min-w-[280px]">
                    <div className="flex justify-between items-center gap-8">
                      <span className="font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        INVOICE
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white uppercase">
                        {invoice.invoiceNumber}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-8">
                      <span className="font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        DATE
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {format(new Date(invoice.issueDate), "yyyy/MM/dd")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-8">
                      <span className="font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        TERMS
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {invoice.dueDate
                          ? (() => {
                              const issue =
                                typeof invoice.issueDate === "string"
                                  ? new Date(invoice.issueDate)
                                  : invoice.issueDate;
                              const due =
                                typeof invoice.dueDate === "string"
                                  ? new Date(invoice.dueDate)
                                  : invoice.dueDate;
                              const diffTime = due.getTime() - issue.getTime();
                              const diffDays = Math.ceil(
                                diffTime / (1000 * 60 * 60 * 24),
                              );
                              return `Net ${diffDays}`;
                            })()
                          : "Net 3"}
                      </span>
                    </div>
                    {invoice.dueDate && (
                      <div className="flex justify-between items-center gap-8">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 uppercase">
                          DUE DATE
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {format(new Date(invoice.dueDate), "yyyy/MM/dd")}
                        </span>
                      </div>
                    )}
                  </div>
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
                  {invoice.charges.map((charge: any) => (
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
                          ¥
                          {parseFloat(
                            charge.amount.toString(),
                          ).toLocaleString()}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 dark:border-[#2C2C2C]">
                    <td className="py-3 px-4 text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Subtotal
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right w-32">
                      <p className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        ¥{subtotal.toLocaleString()}
                      </p>
                    </td>
                  </tr>
                  {invoice.taxEnabled && taxAmount > 0 && (
                    <tr>
                      <td className="py-3 px-4 text-right">
                        <p className="text-gray-700 dark:text-gray-300">
                          Tax ({invoice.taxRate}%)
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right w-32">
                        <p className="text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          ¥{taxAmount.toLocaleString()}
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

        {/* Payment Section */}
        {invoice.paymentStatus !== PaymentStatus.PAID && (
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
              {(bankDetails1 || bankDetails2) && (
                <div className="space-y-4">
                  {invoice.wisePaymentLink && <Separator />}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                      Bank Transfer Details
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
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

                      {/* Bank Account 2 */}
                      {bankDetails2 && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                            MUFG Bank (三菱UFJ銀行)
                          </h4>
                          <div className="space-y-2 text-sm">
                            {renderBankDetail(
                              "Bank Name",
                              bankDetails2.name,
                              "bank2-name",
                            )}
                            {renderBankDetail(
                              "Account Name",
                              bankDetails2.accountName,
                              "bank2-accountName",
                            )}
                            {renderBankDetail(
                              "Account Number",
                              bankDetails2.accountNo,
                              "bank2-accountNo",
                              true,
                            )}
                            {renderBankDetail(
                              "SWIFT Code",
                              bankDetails2.swiftCode,
                              "bank2-swiftCode",
                              true,
                            )}
                            {renderBankDetail(
                              "Branch",
                              bankDetails2.branchName,
                              "bank2-branchName",
                            )}
                            {renderBankDetail(
                              "Bank Address",
                              bankDetails2.bankAddress,
                              "bank2-bankAddress",
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Fallback if no payment method */}
              {!invoice.wisePaymentLink && !bankDetails1 && !bankDetails2 && (
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
