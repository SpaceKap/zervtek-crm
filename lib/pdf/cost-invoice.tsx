import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 30,
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
    backgroundColor: "#f0f0f0",
    padding: 5,
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
    padding: 5,
  },
  label: {
    width: "60%",
  },
  amount: {
    width: "40%",
    textAlign: "right",
    fontWeight: "bold",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    padding: 8,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: "1 solid #e0e0e0",
  },
  tableCol1: {
    width: "50%",
  },
  tableCol2: {
    width: "25%",
  },
  tableCol3: {
    width: "25%",
    textAlign: "right",
  },
  summary: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f9f9f9",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  summaryLabel: {
    fontWeight: "bold",
  },
  profit: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 10,
    paddingTop: 10,
    borderTop: "2 solid #000",
  },
});

interface CostInvoicePDFProps {
  invoice: any;
  costInvoice: any;
  companyInfo: any;
}

export function CostInvoicePDF({
  invoice,
  costInvoice,
  companyInfo,
}: CostInvoicePDFProps) {
  const vehicleDisplay = invoice.vehicle
    ? (invoice.vehicle.make && invoice.vehicle.model
        ? `${invoice.vehicle.year || ""} ${invoice.vehicle.make} ${invoice.vehicle.model}`.trim()
        : invoice.vehicle.vin)
    : "Container/Shipping";

  const totalRevenue = parseFloat(costInvoice.totalRevenue.toString());
  const totalCost = parseFloat(costInvoice.totalCost.toString());
  const profit = parseFloat(costInvoice.profit.toString());
  const margin = parseFloat(costInvoice.margin.toString());
  const roi = parseFloat(costInvoice.roi.toString());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{companyInfo.name}</Text>
          <Text style={styles.title}>
            Cost Invoice - {invoice.invoiceNumber}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {invoice.vehicle ? "Vehicle Information" : "Invoice Details"}
          </Text>
          {invoice.vehicle ? (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>VIN:</Text>
                <Text>{invoice.vehicle.vin}</Text>
              </View>
              {(invoice.vehicle.make || invoice.vehicle.model) && (
                <View style={styles.row}>
                  <Text style={styles.label}>Vehicle:</Text>
                  <Text>{vehicleDisplay}</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.row}>
              <Text style={styles.label}>Type:</Text>
              <Text>{vehicleDisplay}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Vehicle/VIN</Text>
            <Text style={styles.amount}>¥{totalRevenue.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Costs</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCol1}>Description</Text>
            <Text style={styles.tableCol2}>Vendor</Text>
            <Text style={styles.tableCol3}>Amount</Text>
          </View>
          {costInvoice.costItems.map((item: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCol1}>{item.description}</Text>
              <Text style={styles.tableCol2}>{item.vendor?.name || "-"}</Text>
              <Text style={styles.tableCol3}>
                ¥{parseFloat(item.amount.toString()).toLocaleString()}
              </Text>
            </View>
          ))}
          <View
            style={[
              styles.row,
              { borderTop: "2 solid #000", marginTop: 10, paddingTop: 10 },
            ]}
          >
            <Text style={styles.label}>Total Costs</Text>
            <Text style={styles.amount}>¥{totalCost.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Revenue:</Text>
            <Text>¥{totalRevenue.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Costs:</Text>
            <Text>¥{totalCost.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Margin:</Text>
            <Text>{margin.toFixed(2)}%</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ROI:</Text>
            <Text>{roi.toFixed(2)}%</Text>
          </View>
          <View style={styles.profit}>
            <Text>
              {profit >= 0 ? "Profit" : "Loss"}: ¥
              {Math.abs(profit).toLocaleString()}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
