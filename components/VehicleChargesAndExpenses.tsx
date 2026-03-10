"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { VehicleExpensesManager } from "./VehicleExpensesManager";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface AggregatedCharge {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  description: string;
  chargeTypeName: string | null;
  amount: number;
}

interface PaymentData {
  totalRevenue: string;
  totalCharges?: string;
  chargesBreakdown?: {
    subtotalPositive: string;
    discountTotal: string;
    depositTotal: string;
    taxTotal: string;
  };
  aggregatedCharges?: AggregatedCharge[];
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    charges: Array<{ id: string; description: string; amount: string; chargeType?: { name?: string } }>;
    paymentStatus: string;
    taxEnabled?: boolean;
    taxRate?: string | number;
  }>;
}

interface VehicleChargesAndExpensesProps {
  vehicleId: string;
  paymentData: PaymentData | null;
  loading: boolean;
  onRefresh: () => void;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(n);
}

export function VehicleChargesAndExpenses({
  vehicleId,
  paymentData,
  loading,
  onRefresh,
}: VehicleChargesAndExpensesProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
        <span className="material-symbols-outlined text-3xl animate-pulse mb-2">receipt_long</span>
        Loading charges…
      </div>
    );
  }

  const totalCharges = paymentData?.totalCharges != null ? parseFloat(paymentData.totalCharges) : (paymentData ? parseFloat(paymentData.totalRevenue) : 0);
  const breakdown = paymentData?.chargesBreakdown;
  // Only show positive charges in the table; discount/deposit are deducted in the summary below (only deduct after)
  const lineItemCharges = (paymentData?.aggregatedCharges ?? []).filter((c) => {
    const name = (c.chargeTypeName ?? "").toLowerCase();
    return name !== "discount" && name !== "deposit";
  });
  const hasCharges = lineItemCharges.length > 0 || (breakdown && (parseFloat(breakdown.discountTotal) > 0 || parseFloat(breakdown.depositTotal) > 0));

  return (
    <div className="space-y-8">
      {/* All charges from all invoices: Subtotal → Discount → Deposit → Tax → Total (amount due) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-muted-foreground">receipt_long</span>
            All charges (all invoices)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasCharges ? (
            <>
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium">Invoice</th>
                      <th className="text-left py-3 px-4 font-medium">Description</th>
                      <th className="text-right py-3 px-4 font-medium w-32">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItemCharges.map((c) => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
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
                        </td>
                        <td className="py-3 px-4 text-right font-medium tabular-nums">
                          {c.amount < 0 ? "−" : ""}{formatCurrency(Math.abs(c.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Breakdown: Subtotal → Discount → Deposit → Tax → Total (only deduct here, not in table above) */}
              {(breakdown || totalCharges !== 0) && (
                <div className="mt-4 w-full max-w-sm ml-auto rounded-lg border bg-muted/30 p-4 text-sm">
                  {breakdown && (
                    <div className="space-y-2">
                      <div className="flex justify-between pb-2 border-b border-border">
                        <span className="font-semibold text-foreground">Subtotal</span>
                        <span className="tabular-nums font-semibold">{formatCurrency(parseFloat(breakdown.subtotalPositive))}</span>
                      </div>
                      {parseFloat(breakdown.discountTotal) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Discount</span>
                          <span className="tabular-nums font-medium text-red-600 dark:text-red-400">−{formatCurrency(parseFloat(breakdown.discountTotal))}</span>
                        </div>
                      )}
                      {parseFloat(breakdown.depositTotal) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Deposit</span>
                          <span className="tabular-nums font-medium text-red-600 dark:text-red-400">−{formatCurrency(parseFloat(breakdown.depositTotal))}</span>
                        </div>
                      )}
                      {parseFloat(breakdown.taxTotal) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Japanese Consumption Tax</span>
                          <span className="tabular-nums font-medium">{formatCurrency(parseFloat(breakdown.taxTotal))}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between pt-2 mt-2 border-t font-semibold">
                    <span>Total (amount due)</span>
                    <span className="tabular-nums">{formatCurrency(totalCharges)}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">
              <span className="material-symbols-outlined text-3xl mb-2 block">receipt</span>
              <p className="text-sm">No invoice charges yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-muted-foreground">account_balance_wallet</span>
            Our expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleExpensesManager vehicleId={vehicleId} onUpdate={onRefresh} />
        </CardContent>
      </Card>
    </div>
  );
}
