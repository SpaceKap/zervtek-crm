import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#000000",
    lineHeight: 1.4,
    backgroundColor: "#ffffff",
  },
  // Top Section - Company Info and Invoice Title
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  companySection: {
    flex: 1,
  },
  companyName: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  companyLine: {
    fontSize: 9,
    marginBottom: 2,
    lineHeight: 1.4,
  },
  invoiceTitleSection: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textTransform: "uppercase",
  },
  // Bill To Section
  billToSection: {
    marginBottom: 20,
  },
  billToLabel: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  billToName: {
    fontSize: 10,
  },
  // Invoice Details Table (right side)
  invoiceDetailsContainer: {
    alignItems: "flex-end",
    marginTop: -60, // Overlap with Bill To section
  },
  invoiceDetailsTable: {
    width: 200,
  },
  invoiceDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  invoiceDetailLabel: {
    fontSize: 9,
    fontWeight: "bold",
    marginRight: 10,
    textTransform: "uppercase",
  },
  invoiceDetailValue: {
    fontSize: 9,
  },
  // Items Table
  itemsTable: {
    width: "100%",
    marginBottom: 15,
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
  vehicleInfo: {
    fontSize: 8,
    color: "#666666",
    marginTop: 2,
  },
  // Totals Section
  totalsSection: {
    marginBottom: 20,
  },
  balanceDueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1 solid #000000",
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
    marginTop: 20,
    paddingTop: 15,
    borderTop: "1 solid #cccccc",
  },
  paymentLine: {
    flexDirection: "row",
    marginBottom: 3,
    fontSize: 8,
  },
  paymentLabel: {
    width: 100,
    fontWeight: "bold",
  },
  paymentValue: {
    flex: 1,
  },
  notesSection: {
    marginTop: 15,
    fontSize: 9,
  },
});

interface ContainerInvoicePDFProps {
  containerInvoice: any;
  companyInfo: any;
}

export function ContainerInvoicePDF({
  containerInvoice,
  companyInfo,
}: ContainerInvoicePDFProps) {
  const billingAddress = containerInvoice.customer.billingAddress as any;
  const companyAddress = companyInfo.address as any;
  const bankDetails1 = companyInfo.bankDetails1 as any;
  const bankDetails2 = companyInfo.bankDetails2 as any;

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

  // Calculate totals
  const subtotal = containerInvoice.vehicles.reduce(
    (sum: number, v: any) => sum + parseFloat(v.allocatedAmount.toString()),
    0,
  );

  const taxAmount = containerInvoice.taxEnabled
    ? subtotal * (parseFloat(containerInvoice.taxRate.toString()) / 100)
    : 0;

  const total = subtotal + taxAmount;

  const issueDate = formatDate(
    containerInvoice.issueDate || containerInvoice.createdAt,
  );
  const dueDate = formatDate(containerInvoice.dueDate);

  // Calculate terms (Net X days)
  const calculateTerms = () => {
    if (!containerInvoice.dueDate || !containerInvoice.issueDate)
      return "Net 3";
    const issue =
      typeof containerInvoice.issueDate === "string"
        ? new Date(containerInvoice.issueDate)
        : containerInvoice.issueDate;
    const due =
      typeof containerInvoice.dueDate === "string"
        ? new Date(containerInvoice.dueDate)
        : containerInvoice.dueDate;
    const diffTime = due.getTime() - issue.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `Net ${diffDays}`;
  };

  const terms = calculateTerms();

  // Format company address as single line
  const formatCompanyAddress = () => {
    if (!companyAddress) return "";
    const parts = [
      companyAddress.street,
      companyAddress.city,
      companyAddress.state,
      companyAddress.zip,
      companyAddress.country,
    ].filter(Boolean);
    return parts.join(", ");
  };

  const companyAddressText = formatCompanyAddress();

  // Format vehicle display
  const formatVehicle = (vehicle: any) => {
    const parts = [];
    if (vehicle.vehicle.year) parts.push(vehicle.vehicle.year);
    if (vehicle.vehicle.make) parts.push(vehicle.vehicle.make);
    if (vehicle.vehicle.model) parts.push(vehicle.vehicle.model);
    if (vehicle.vehicle.vin) parts.push(`VIN: ${vehicle.vehicle.vin}`);
    return parts.join(" ");
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Top Section - Company Info and Invoice Title */}
        <View style={styles.topSection}>
          <View style={styles.companySection}>
            <Text style={styles.companyName}>
              {companyInfo.name?.toUpperCase() || "COMPANY NAME"}
            </Text>
            {companyAddressText && (
              <Text style={styles.companyLine}>{companyAddressText}</Text>
            )}
            {companyInfo.phone && (
              <Text style={styles.companyLine}>{companyInfo.phone}</Text>
            )}
            {companyInfo.email && (
              <Text style={styles.companyLine}>{companyInfo.email}</Text>
            )}
          </View>
          <View style={styles.invoiceTitleSection}>
            <Text style={styles.invoiceTitle}>CONTAINER INVOICE</Text>
          </View>
        </View>

        {/* Bill To Section */}
        <View style={styles.billToSection}>
          <Text style={styles.billToLabel}>BILL TO</Text>
          <Text style={styles.billToName}>
            {containerInvoice.customer.name}
          </Text>
        </View>

        {/* Invoice Details (Right Side) */}
        <View style={styles.invoiceDetailsContainer}>
          <View style={styles.invoiceDetailsTable}>
            <View style={styles.invoiceDetailRow}>
              <Text style={styles.invoiceDetailLabel}>INVOICE</Text>
              <Text style={styles.invoiceDetailValue}>
                {containerInvoice.invoiceNumber || "N/A"}
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
            {containerInvoice.sharedInvoice && (
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceDetailLabel}>CONTAINER</Text>
                <Text style={styles.invoiceDetailValue}>
                  {containerInvoice.sharedInvoice.invoiceNumber}
                </Text>
              </View>
            )}
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
          {containerInvoice.vehicles.map((vehicle: any, index: number) => {
            const amount = parseFloat(vehicle.allocatedAmount.toString());
            const vehicleDisplay = formatVehicle(vehicle);
            return (
              <View key={index} style={styles.tableRow}>
                <View style={styles.colDescription}>
                  <Text style={styles.tableRowText}>
                    Container Freight - Vehicle {index + 1}
                  </Text>
                  <Text style={styles.vehicleInfo}>{vehicleDisplay}</Text>
                </View>
                <Text style={[styles.colRate, styles.tableRowText]}>
                  {formatCurrency(amount)}
                </Text>
                <Text style={[styles.colAmount, styles.tableRowText]}>
                  {formatCurrency(amount)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Balance Due */}
        <View style={styles.totalsSection}>
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

        {/* Notes */}
        {containerInvoice.notes && (
          <View style={styles.notesSection}>
            <Text style={{ fontWeight: "bold", marginBottom: 4 }}>Notes:</Text>
            <Text>{containerInvoice.notes}</Text>
          </View>
        )}

        {/* Payment Information */}
        {bankDetails1 && (
          <View style={styles.paymentSection}>
            {bankDetails1.name && (
              <View style={styles.paymentLine}>
                <Text style={styles.paymentLabel}>Bank Name</Text>
                <Text style={styles.paymentValue}>: {bankDetails1.name}</Text>
              </View>
            )}
            {bankDetails1.swiftCode && (
              <View style={styles.paymentLine}>
                <Text style={styles.paymentLabel}>Swift</Text>
                <Text style={styles.paymentValue}>
                  : {bankDetails1.swiftCode}
                </Text>
              </View>
            )}
            {bankDetails1.branchName && (
              <View style={styles.paymentLine}>
                <Text style={styles.paymentLabel}>Branch (Code)</Text>
                <Text style={styles.paymentValue}>
                  : {bankDetails1.branchName}
                </Text>
              </View>
            )}
            {bankDetails1.accountNo && (
              <View style={styles.paymentLine}>
                <Text style={styles.paymentLabel}>Account No</Text>
                <Text style={styles.paymentValue}>
                  : {bankDetails1.accountNo}
                </Text>
              </View>
            )}
            {bankDetails1.bankAddress && (
              <View style={styles.paymentLine}>
                <Text style={styles.paymentLabel}>Bank Address</Text>
                <Text style={styles.paymentValue}>
                  : {bankDetails1.bankAddress}
                </Text>
              </View>
            )}
            {bankDetails1.accountName && (
              <View style={styles.paymentLine}>
                <Text style={styles.paymentLabel}>Account Name</Text>
                <Text style={styles.paymentValue}>
                  : {bankDetails1.accountName}
                </Text>
              </View>
            )}
            {companyInfo.email && (
              <View style={styles.paymentLine}>
                <Text style={styles.paymentLabel}>Paypal</Text>
                <Text style={styles.paymentValue}>: {companyInfo.email}</Text>
              </View>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}
