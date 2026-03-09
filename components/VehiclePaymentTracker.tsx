"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getChargesSubtotal } from "@/lib/charge-utils";
import { Button } from "./ui/button";
import { AddTransactionDialog } from "./AddTransactionDialog";
import { VehicleCostBreakdown } from "./VehicleCostBreakdown";
import { TransactionDirection } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface PaymentTimelineEntry {
  id: string;
  date: string;
  amount: number;
  currency: string;
  kind: "payment" | "deposit_applied";
  type: string | null;
  description?: string | null;
  referenceNumber?: string | null;
  invoiceId?: string | null;
  depositNumber?: string | null;
  invoiceNumber?: string | null;
  invoiceTotal?: number | null;
  invoicePaymentStatus?: string | null;
}

interface AggregatedCharge {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  description: string;
  chargeTypeName: string | null;
  amount: number;
  appliedDepositTransactionId: string | null;
}

interface PaymentData {
  totalRevenue: string;
  totalCost: string;
  profit: string;
  margin: string;
  roi?: string;
  totalCharges: string;
  totalReceived: string;
  balanceDue: string;
  customerId?: string | null;
  paymentTimeline?: PaymentTimelineEntry[];
  aggregatedCharges?: AggregatedCharge[];
  invoices: Array<{
    id: string;
    customerId?: string;
    invoiceNumber: string;
    charges: Array<{
      id: string;
      description: string;
      amount: string;
    }>;
    paymentStatus: string;
  }>;
}

interface VehiclePaymentTrackerProps {
  vehicleId: string;
}

export function VehiclePaymentTracker({
  vehicleId,
}: VehiclePaymentTrackerProps) {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionDirection, setTransactionDirection] =
    useState<TransactionDirection>("INCOMING");

  useEffect(() => {
    fetchPayments();
  }, [vehicleId]);

  const fetchPayments = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/payments`);
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setPaymentData(data);
      } else {
        setPaymentData(null);
        setErrorMessage(
          typeof data?.error === "string"
            ? data.error
            : response.status === 404
              ? "Vehicle not found."
              : response.status === 401
                ? "Please sign in again."
                : "Could not load payment data for this vehicle.",
        );
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      setPaymentData(null);
      setErrorMessage("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = () => {
    setTransactionDirection("INCOMING");
    setTransactionDialogOpen(true);
  };

  const onCostUpdate = useCallback(() => {
    fetchPayments();
  }, [vehicleId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <span className="material-symbols-outlined text-4xl animate-pulse mb-2">
          account_balance
        </span>
        <p>Loading payments & profit…</p>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <Card>
        <CardContent className="py-12 px-6 text-center">
          <span className="material-symbols-outlined text-4xl text-destructive/80 mb-3 block">
            error_outline
          </span>
          <p className="text-muted-foreground mb-4">
            {errorMessage ?? "Could not load payment data for this vehicle."}
          </p>
          <Button variant="outline" onClick={fetchPayments} className="gap-2">
            <span className="material-symbols-outlined">refresh</span>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const revenue = parseFloat(paymentData.totalRevenue);
  const cost = parseFloat(paymentData.totalCost);
  const profit = parseFloat(paymentData.profit);
  const margin = parseFloat(paymentData.margin);
  const roi = parseFloat(paymentData.roi ?? "0");
  const received = parseFloat(paymentData.totalReceived || "0");
  const due = parseFloat(paymentData.balanceDue || "0");

  const formatCurrency = (n: number) =>
    `¥${n.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}`;

  const paymentLabel = (entry: PaymentTimelineEntry) => {
    if (entry.kind === "deposit_applied") return "Deposit applied";
    const status = entry.invoicePaymentStatus ?? "";
    if (status === "PAID") return "Full payment";
    if (status === "PARTIALLY_PAID") return "Partial payment";
    return (entry.type || "Payment").replace(/_/g, " ");
  };

  return (
    <div className="space-y-8">
      {/* Header: Revenue, Cost, Profit, Margin, ROI, Received, Due */}
      <div className="rounded-xl border-2 bg-card p-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center sm:text-left">
          <div>
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(revenue)}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Cost</p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(cost)}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Profit</p>
            <p className={`text-lg font-bold tabular-nums ${profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
            </p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Margin</p>
            <p className="text-lg font-bold tabular-nums">{margin.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">ROI</p>
            <p className="text-lg font-bold tabular-nums">{roi.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Received</p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(received)}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Due</p>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(due)}</p>
          </div>
        </div>
      </div>

      {/* 1. All charges from all invoices in one place + total */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-muted-foreground">
              receipt_long
            </span>
            All charges (all invoices)
          </CardTitle>
          <CardDescription>
            Every charge from every invoice for this vehicle in one place. Total below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentData.aggregatedCharges &&
          paymentData.aggregatedCharges.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">
                      Invoice
                    </th>
                    <th className="text-left py-3 px-4 font-medium">
                      Description
                    </th>
                    <th className="text-right py-3 px-4 font-medium w-32">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paymentData.aggregatedCharges.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/dashboard/invoices/${c.invoiceId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {c.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        {c.description}
                        {c.chargeTypeName && (
                          <span className="text-muted-foreground text-xs ml-1.5">
                            ({c.chargeTypeName})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium tabular-nums">
                        {formatCurrency(c.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-primary/10 font-semibold">
                    <td className="py-3 px-4" colSpan={2}>
                      Total (all charges)
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {formatCurrency(revenue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">
              <span className="material-symbols-outlined text-3xl mb-2 block">
                receipt
              </span>
              <p className="text-sm">No invoice charges yet.</p>
              <p className="text-xs mt-1">
                Create an invoice for this vehicle to see charges here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Our costs – show/add */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-muted-foreground">
              account_balance_wallet
            </span>
            Our costs
          </CardTitle>
          <CardDescription>
            Add and edit your costs for this vehicle. These are subtracted from revenue (profit/margin/ROI in header).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VehicleCostBreakdown vehicleId={vehicleId} onUpdate={onCostUpdate} />
        </CardContent>
      </Card>

      {/* 3. Payments – deposits, partial, full; synced with Transactions & Customer page */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-muted-foreground">
                  payments
                </span>
                Payments
              </CardTitle>
            </div>
            <Button onClick={handleAddPayment} size="sm" className="gap-1.5 shrink-0">
              <span className="material-symbols-outlined">add_circle</span>
              Add payment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paymentData.paymentTimeline &&
          paymentData.paymentTimeline.length > 0 ? (
            <ul className="space-y-2">
              {paymentData.paymentTimeline.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 px-4 rounded-lg border bg-muted/20 hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                    <span className="font-semibold tabular-nums shrink-0">
                      {formatCurrency(entry.amount)}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                      {paymentLabel(entry)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {entry.referenceNumber && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      Ref: {entry.referenceNumber}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed py-8 text-center text-muted-foreground text-sm">
              No payments yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Related invoices */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-muted-foreground">
              description
            </span>
            Invoices
          </CardTitle>
          <CardDescription>
            All invoices linked to this vehicle
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentData.invoices.length > 0 ? (
            <ul className="space-y-3">
              {paymentData.invoices.map((invoice) => {
                const invoiceTotal = getChargesSubtotal(invoice.charges);
                return (
                  <li key={invoice.id}>
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <span className="font-medium">{invoice.invoiceNumber}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {invoice.paymentStatus.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(invoiceTotal)}
                        </span>
                        <span className="material-symbols-outlined text-muted-foreground">
                          arrow_forward
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed py-8 text-center text-muted-foreground text-sm">
              No invoices yet. Create one from the vehicle header or from
              Invoices.
            </div>
          )}
        </CardContent>
      </Card>

      <AddTransactionDialog
        open={transactionDialogOpen}
        onOpenChange={(open) => {
          setTransactionDialogOpen(open);
        }}
        onSuccess={() => {
          fetchPayments();
        }}
        defaultDirection={transactionDirection}
        defaultVehicleId={vehicleId}
        defaultCustomerId={
          paymentData?.customerId ??
          paymentData?.invoices?.[0]?.customerId ??
          undefined
        }
      />
    </div>
  );
}
