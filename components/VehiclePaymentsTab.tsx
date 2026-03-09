"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { AddTransactionDialog } from "./AddTransactionDialog";
import { TransactionDirection } from "@prisma/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface PaymentTimelineEntry {
  id: string;
  date: string;
  amount: number;
  kind: "payment" | "deposit_applied";
  type: string | null;
  referenceNumber?: string | null;
  invoiceId?: string | null;
  depositNumber?: string | null;
  invoiceNumber?: string | null;
  invoicePaymentStatus?: string | null;
}

interface VehiclePaymentsTabProps {
  vehicleId: string;
  paymentData: {
    paymentTimeline?: PaymentTimelineEntry[];
    customerId?: string | null;
    invoices: Array<{ id: string; paymentStatus: string; customerId?: string | null }>;
  } | null;
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

function paymentLabel(entry: PaymentTimelineEntry): string {
  if (entry.kind === "deposit_applied") return "Deposit applied";
  const status = entry.invoicePaymentStatus ?? "";
  if (status === "PAID") return "Full payment";
  if (status === "PARTIALLY_PAID") return "Partial payment";
  return (entry.type || "Payment").replace(/_/g, " ");
}

export function VehiclePaymentsTab({
  vehicleId,
  paymentData,
  loading,
  onRefresh,
}: VehiclePaymentsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
        <span className="material-symbols-outlined text-3xl animate-pulse mb-2">payments</span>
        Loading payments…
      </div>
    );
  }

  const timeline = paymentData?.paymentTimeline ?? [];
  const hasEntries = timeline.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-muted-foreground">payments</span>
                Payments
              </CardTitle>
            </div>
            <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-1.5 shrink-0">
              <span className="material-symbols-outlined">add_circle</span>
              Add payment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {hasEntries ? (
            <ul className="space-y-2">
              {timeline.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 px-4 rounded-lg border bg-muted/20 hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                    <span className="font-semibold tabular-nums shrink-0">{formatCurrency(entry.amount)}</span>
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                      {paymentLabel(entry)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {entry.referenceNumber && (
                    <span className="text-xs text-muted-foreground shrink-0">Ref: {entry.referenceNumber}</span>
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

      <AddTransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={onRefresh}
        defaultDirection="INCOMING"
        defaultVehicleId={vehicleId}
        defaultCustomerId={paymentData?.customerId ?? paymentData?.invoices?.[0]?.customerId ?? undefined}
      />
    </div>
  );
}
