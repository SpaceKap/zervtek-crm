import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { getChargesSubtotal, isChargeSubtracting } from "@/lib/charge-utils";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#000000",
    lineHeight: 1.3,
    backgroundColor: "#ffffff",
  },
  // Top Section - Company Info and Invoice Title
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  companySection: {
    flex: 1,
  },
  logoContainer: {
    marginBottom: 8,
  },
  companyName: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  companyLine: {
    fontSize: 8,
    marginBottom: 2,
    lineHeight: 1.3,
  },
  invoiceTitleSection: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    textTransform: "uppercase",
  },
  // Bill To Section
  billToSection: {
    flex: 1,
    marginRight: 20,
  },
  billToLabel: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  billToName: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 3,
  },
  // Invoice Details Table (right side)
  invoiceDetailsContainer: {
    alignItems: "flex-start",
    paddingTop: 13, // Align with customer name (BILL TO label height + margin)
  },
  invoiceDetailsTable: {
    width: 200,
  },
  invoiceDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  invoiceDetailLabel: {
    fontSize: 9,
    fontWeight: "bold",
    marginRight: 10,
    textTransform: "uppercase",
  },
  invoiceDetailValue: {
    fontSize: 9,
    fontWeight: "bold",
  },
  // Items Table
  itemsTable: {
    width: "100%",
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1 solid #000000",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  colDescription: {
    width: "60%",
  },
  colRate: {
    width: "20%",
    textAlign: "right",
  },
  colAmount: {
    width: "20%",
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottom: "0.5 solid #cccccc",
  },
  tableRowText: {
    fontSize: 9,
  },
  tableRowDescription: {
    fontSize: 9,
    fontWeight: "bold",
  },
  // Totals Section
  totalsSection: {
    marginBottom: 12,
    width: "100%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    width: "100%",
  },
  totalLabel: {
    fontSize: 9,
    color: "#666666",
  },
  totalAmount: {
    fontSize: 9,
    fontWeight: "normal",
    textAlign: "right",
  },
  balanceDueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    paddingBottom: 3,
    borderTop: "2 solid #000000",
    width: "100%",
  },
  balanceDueLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  balanceDueAmount: {
    fontSize: 10,
    fontWeight: "bold",
  },
  // Payment Information Section
  paymentSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1 solid #cccccc",
  },
  paymentTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  banksContainer: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 4,
    marginBottom: 8,
    flexDirection: "row",
    gap: 20,
  },
  bankColumn: {
    flex: 1,
  },
  bankTitle: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 6,
    textTransform: "uppercase",
    color: "#000000",
    borderBottom: "1 solid #cccccc",
    paddingBottom: 4,
  },
  paymentLine: {
    marginBottom: 3,
    fontSize: 7,
    lineHeight: 1.3,
  },
  paymentLabel: {
    fontSize: 7,
    fontWeight: "bold",
    marginBottom: 1,
    color: "#333333",
  },
  paymentValue: {
    fontSize: 7,
    color: "#000000",
  },
  paypalSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1 solid #cccccc",
  },
  paypalLabel: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 2,
  },
  paypalValue: {
    fontSize: 8,
  },
});

interface CustomerInvoicePDFProps {
  invoice: any;
  companyInfo: any;
}

export function CustomerInvoicePDF({
  invoice,
  companyInfo,
}: CustomerInvoicePDFProps) {
  const billingAddress = invoice.customer.billingAddress as any;
  const shippingAddress = invoice.customer.shippingAddress as any;
  const companyAddress = companyInfo.address as any;
  const bankDetails1 = companyInfo.bankDetails1 as any;

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  const formatCurrencyNegative = (amount: number) => {
    if (amount >= 0) return formatCurrency(amount);
    return `-${formatCurrency(Math.abs(amount))}`;
  };

  // Calculate totals (getChargesSubtotal includes discounts/deposits as negative)
  const subtotal = getChargesSubtotal(invoice.charges);

  const taxAmount = invoice.taxEnabled
    ? subtotal * (parseFloat(invoice.taxRate.toString()) / 100)
    : 0;

  const recycleFee = invoice.taxEnabled ? taxAmount : 0;

  const total = subtotal + taxAmount + recycleFee;

  const issueDate = formatDate(invoice.issueDate || invoice.createdAt);
  const dueDate = formatDate(invoice.dueDate);

  // Calculate terms (Net X days)
  const calculateTerms = () => {
    if (!invoice.dueDate || !invoice.issueDate) return "Net 3";
    const issue =
      typeof invoice.issueDate === "string"
        ? new Date(invoice.issueDate)
        : invoice.issueDate;
    const due =
      typeof invoice.dueDate === "string"
        ? new Date(invoice.dueDate)
        : invoice.dueDate;
    const diffTime = due.getTime() - issue.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `Net ${diffDays}`;
  };

  const terms = calculateTerms();

  // Format company address in 3-4 lines
  const formatCompanyAddress = () => {
    if (!companyAddress) return [];
    const lines = [];
    if (companyAddress.street) lines.push(companyAddress.street);
    const cityStateZip = [
      companyAddress.city,
      companyAddress.state,
      companyAddress.zip,
    ]
      .filter(Boolean)
      .join(", ");
    if (cityStateZip) lines.push(cityStateZip);
    if (companyAddress.country) lines.push(companyAddress.country);
    return lines;
  };

  const companyAddressLines = formatCompanyAddress();

  // Format customer billing address in multiple lines
  const formatCustomerAddress = (address: any) => {
    if (!address) return [];
    const lines = [];
    if (address.street) lines.push(address.street);
    if (address.apartment) lines.push(address.apartment);
    const cityStateZip = [address.city, address.state, address.zip]
      .filter(Boolean)
      .join(", ");
    if (cityStateZip) lines.push(cityStateZip);
    if (address.country) lines.push(address.country);
    return lines;
  };

  const billingAddressLines = formatCustomerAddress(billingAddress);
  const shippingAddressLines = formatCustomerAddress(shippingAddress);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Top Section - Company Info and Invoice Title */}
        <View style={styles.topSection}>
          <View style={styles.companySection}>
            {companyInfo.logo && typeof companyInfo.logo === "string" && (
              <View style={styles.logoContainer}>
                <Image
                  src={companyInfo.logo}
                  style={{
                    width: 100,
                    height: 50,
                    objectFit: "contain",
                  }}
                />
              </View>
            )}
            <Text style={styles.companyName}>
              {companyInfo.name?.toUpperCase() || "COMPANY NAME"}
            </Text>
            {companyAddressLines.map((line, index) => (
              <Text key={index} style={styles.companyLine}>
                {line}
              </Text>
            ))}
            {companyInfo.phone && (
              <Text style={styles.companyLine}>{companyInfo.phone}</Text>
            )}
            {companyInfo.email && (
              <Text style={styles.companyLine}>{companyInfo.email}</Text>
            )}
          </View>
          <View style={styles.invoiceTitleSection}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
          </View>
        </View>

        {/* From, Bill To, Ship To, and Invoice Details */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 15,
            gap: 15,
          }}
        >
          {/* Bill To Section */}
          <View style={styles.billToSection}>
            <Text style={styles.billToLabel}>BILL TO</Text>
            <Text style={styles.billToName}>{invoice.customer.name}</Text>
            {billingAddressLines.map((line, index) => (
              <Text key={index} style={styles.companyLine}>
                {line}
              </Text>
            ))}
            {invoice.customer.email && (
              <Text style={styles.companyLine}>{invoice.customer.email}</Text>
            )}
            {invoice.customer.phone && (
              <Text style={styles.companyLine}>{invoice.customer.phone}</Text>
            )}
          </View>

          {/* Ship To Section */}
          <View style={styles.billToSection}>
            <Text style={styles.billToLabel}>SHIP TO</Text>
            <Text style={styles.billToName}>{invoice.customer.name}</Text>
            {shippingAddressLines.length > 0 ? (
              <>
                {shippingAddressLines.map((line, index) => (
                  <Text key={index} style={styles.companyLine}>
                    {line}
                  </Text>
                ))}
              </>
            ) : (
              <>
                {billingAddressLines.map((line, index) => (
                  <Text key={index} style={styles.companyLine}>
                    {line}
                  </Text>
                ))}
              </>
            )}
            {invoice.customer.email && (
              <Text style={styles.companyLine}>{invoice.customer.email}</Text>
            )}
            {invoice.customer.phone && (
              <Text style={styles.companyLine}>{invoice.customer.phone}</Text>
            )}
          </View>

          {/* Invoice Details (Right Side) */}
          <View style={styles.invoiceDetailsContainer}>
            <View style={styles.invoiceDetailsTable}>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailLabel}>INVOICE</Text>
                <Text style={styles.invoiceDetailValue}>
                  {invoice.invoiceNumber || "N/A"}
                </Text>
              </View>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailLabel}>DATE</Text>
                <Text style={styles.invoiceDetailValue}>{issueDate}</Text>
              </View>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailLabel}>TERMS</Text>
                <Text style={styles.invoiceDetailValue}>{terms}</Text>
              </View>
              {dueDate && (
                <View style={styles.invoiceDetailRow}>
                  <Text style={styles.invoiceDetailLabel}>DUE DATE</Text>
                  <Text style={styles.invoiceDetailValue}>{dueDate}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.itemsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDescription, styles.tableHeaderText]}>
              DESCRIPTION
            </Text>
            <Text style={[styles.colRate, styles.tableHeaderText]}>RATE</Text>
            <Text style={[styles.colAmount, styles.tableHeaderText]}>
              AMOUNT
            </Text>
          </View>
          {invoice.charges.map((charge: any, index: number) => {
            const amount = parseFloat(charge.amount.toString());
            const isDeduction = isChargeSubtracting(charge);
            const displayAmount = isDeduction ? -amount : amount;
            const formatted = isDeduction ? formatCurrencyNegative(displayAmount) : formatCurrency(displayAmount);
            return (
              <View key={index} style={styles.tableRow}>
                <Text
                  style={[styles.colDescription, styles.tableRowDescription]}
                >
                  {charge.description}
                </Text>
                <Text style={[styles.colRate, styles.tableRowText]}>
                  {formatted}
                </Text>
                <Text style={[styles.colAmount, styles.tableRowText]}>
                  {formatted}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          {/* Subtotal */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalAmount}>
              JPY {formatCurrency(subtotal)}
            </Text>
          </View>
          {/* Tax */}
          {invoice.taxEnabled && taxAmount > 0 && invoice.taxRate && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Tax ({parseFloat(invoice.taxRate.toString())}%)
              </Text>
              <Text style={styles.totalAmount}>
                JPY {formatCurrency(taxAmount)}
              </Text>
            </View>
          )}
          {/* Recycle Fee */}
          {invoice.taxEnabled && recycleFee > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Recycle Fee</Text>
              <Text style={styles.totalAmount}>
                JPY {formatCurrency(recycleFee)}
              </Text>
            </View>
          )}
          {/* Balance Due */}
          <View style={styles.balanceDueRow}>
            <Text style={styles.balanceDueLabel}>BALANCE DUE</Text>
            <Text style={styles.balanceDueAmount}>
              JPY {formatCurrency(total)}
            </Text>
          </View>
          {total === 0 && (
            <View style={{ marginTop: 5 }}>
              <Text style={{ fontSize: 10, fontWeight: "bold" }}>PAID</Text>
            </View>
          )}
        </View>

        {/* Payment Information */}
        {bankDetails1 && (
          <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>Payment Information</Text>
            <View style={styles.banksContainer}>
              {/* Bank 1 */}
              {bankDetails1 && (
                <View style={styles.bankColumn}>
                  <Text style={styles.bankTitle}>
                    Sumitomo Mitsui Banking Corporation (三井住友銀行)
                  </Text>
                  {bankDetails1.name && (
                    <View style={styles.paymentLine}>
                      <Text style={styles.paymentLabel}>Bank Name</Text>
                      <Text style={styles.paymentValue}>
                        {bankDetails1.name}
                      </Text>
                    </View>
                  )}
                  {bankDetails1.accountName && (
                    <View style={styles.paymentLine}>
                      <Text style={styles.paymentLabel}>Account Name</Text>
                      <Text style={styles.paymentValue}>
                        {bankDetails1.accountName}
                      </Text>
                    </View>
                  )}
                  {bankDetails1.accountNo && (
                    <View style={styles.paymentLine}>
                      <Text style={styles.paymentLabel}>Account Number</Text>
                      <Text style={styles.paymentValue}>
                        {bankDetails1.accountNo}
                      </Text>
                    </View>
                  )}
                  {bankDetails1.swiftCode && (
                    <View style={styles.paymentLine}>
                      <Text style={styles.paymentLabel}>SWIFT Code</Text>
                      <Text style={styles.paymentValue}>
                        {bankDetails1.swiftCode}
                      </Text>
                    </View>
                  )}
                  {bankDetails1.branchName && (
                    <View style={styles.paymentLine}>
                      <Text style={styles.paymentLabel}>Branch</Text>
                      <Text style={styles.paymentValue}>
                        {bankDetails1.branchName}
                      </Text>
                    </View>
                  )}
                  {bankDetails1.bankAddress && (
                    <View style={styles.paymentLine}>
                      <Text style={styles.paymentLabel}>Bank Address</Text>
                      <Text style={styles.paymentValue}>
                        {bankDetails1.bankAddress}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            {/* PayPal */}
            {companyInfo.email && (
              <View style={styles.paypalSection}>
                <Text style={styles.paypalLabel}>PayPal</Text>
                <Text style={styles.paypalValue}>{companyInfo.email}</Text>
              </View>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}
