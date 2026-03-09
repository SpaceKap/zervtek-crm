"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { VehicleCostBreakdown } from "./VehicleCostBreakdown";
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

  const revenue = paymentData ? parseFloat(paymentData.totalRevenue) : 0;
  const hasCharges = (paymentData?.aggregatedCharges?.length ?? 0) > 0;

  return (
    <div className="space-y-8">
      {/* All charges from all invoices (same as invoice: -deposit, -discounts) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-muted-foreground">receipt_long</span>
            All charges (all invoices)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasCharges ? (
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
                  {paymentData!.aggregatedCharges!.map((c) => (
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
                        {c.chargeTypeName && (
                          <span className="text-muted-foreground text-xs ml-1.5">({c.chargeTypeName})</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium tabular-nums">
                        {c.amount < 0 ? "−" : ""}{formatCurrency(Math.abs(c.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-primary/10 font-semibold">
                    <td className="py-3 px-4" colSpan={2}>Total (all charges)</td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatCurrency(revenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
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
          <VehicleCostBreakdown vehicleId={vehicleId} onUpdate={onRefresh} />
        </CardContent>
      </Card>
    </div>
  );
}
