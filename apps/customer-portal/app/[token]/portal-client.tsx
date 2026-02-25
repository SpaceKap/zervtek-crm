"use client";

import Link from "next/link";
import {
  Car,
  FileText,
  Receipt,
  CreditCard,
  AlertCircle,
  ChevronRight,
  Ship,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  billingAddress: unknown;
  shippingAddress: unknown;
  portOfDestination: string | null;
};

type Vehicle = {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string;
  purchaseDate: string | Date | null;
  currentShippingStage: string | null;
};

type DocumentWithVehicle = { id: string; vehicleId: string };
type InvoiceWithVehicle = {
  id: string;
  vehicleId: string | null | undefined;
  paymentStatus: string | null;
};

type PortalStats = {
  vehicles: number;
  inTransit: number;
  documents: number;
  invoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  paymentsReceived: number;
  totalReceivedFormatted: string | null;
};

export function PortalClient({
  vehicles,
  transactions,
  allDocuments,
  allInvoices,
  stageLabels,
  stats,
}: {
  customer: Customer;
  vehicles: Vehicle[];
  transactions: { id: string }[];
  allDocuments: DocumentWithVehicle[];
  allInvoices: InvoiceWithVehicle[];
  stageLabels: Record<string, string>;
  stageOrder: string[];
  stats: PortalStats;
}) {
  const formatDate = (d: string | Date | null | undefined) => {
    if (!d) return "—";
    const date = new Date(d);
    return isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  };

  return (
    <div className="space-y-5">
      {/* Overview stats – one row, compact equal-height cards */}
      <div className="grid grid-cols-4 gap-2 min-w-0 sm:gap-3">
        <Card className="min-w-0 overflow-hidden border border-border/80 shadow-sm">
          <CardContent className="flex items-center gap-2 p-3 min-w-0 sm:gap-3 sm:p-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:size-10">
              <Car className="size-4 text-primary sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold tabular-nums sm:text-xl md:text-2xl">{stats.vehicles}</p>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">Vehicles</p>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden border border-border/80 shadow-sm">
          <CardContent className="flex items-center gap-2 p-3 min-w-0 sm:gap-3 sm:p-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 sm:size-10">
              <Ship className="size-4 text-blue-600 sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold tabular-nums sm:text-xl md:text-2xl">{stats.inTransit}</p>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">In transit</p>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden border border-border/80 shadow-sm">
          <CardContent className="flex items-center gap-2 p-3 min-w-0 sm:gap-3 sm:p-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 sm:size-10">
              <FileText className="size-4 text-amber-600 sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold tabular-nums sm:text-xl md:text-2xl">
                <span className="inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 sm:px-2.5">
                  {stats.documents}
                </span>
              </p>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">Documents</p>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden border border-border/80 shadow-sm">
          <CardContent className="flex items-center gap-2 p-3 min-w-0 sm:gap-3 sm:p-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 sm:size-10">
              <Receipt className="size-4 text-emerald-600 sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold tabular-nums sm:text-xl md:text-2xl">
                <span className="inline-flex items-center rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 sm:px-2.5">
                  {stats.invoices}
                </span>
              </p>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">Invoices</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial summary – one row when present */}
      {(stats.unpaidInvoices > 0 ||
        stats.overdueInvoices > 0 ||
        (stats.paymentsReceived > 0 && stats.totalReceivedFormatted)) && (
        <div className="grid grid-cols-3 gap-2 min-w-0 sm:gap-3">
          {stats.overdueInvoices > 0 && (
            <Card className="min-w-0 overflow-hidden border border-destructive/30 bg-destructive/5 shadow-sm">
              <CardContent className="flex items-center gap-2 p-3 min-w-0 sm:gap-3 sm:p-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 sm:size-10">
                  <AlertCircle className="size-4 text-destructive sm:size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold tabular-nums text-destructive sm:text-xl md:text-2xl">
                    {stats.overdueInvoices}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                    Overdue invoice{stats.overdueInvoices !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {stats.unpaidInvoices > 0 && stats.overdueInvoices !== stats.unpaidInvoices && (
            <Card className="min-w-0 overflow-hidden border border-amber-500/30 bg-amber-500/5 shadow-sm">
              <CardContent className="flex items-center gap-2 p-3 min-w-0 sm:gap-3 sm:p-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 sm:size-10">
                  <Receipt className="size-4 text-amber-600 sm:size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold tabular-nums sm:text-xl md:text-2xl">{stats.unpaidInvoices}</p>
                  <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                    Unpaid invoice{stats.unpaidInvoices !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {stats.paymentsReceived > 0 && stats.totalReceivedFormatted && (
            <Card className="min-w-0 overflow-hidden border border-border/80 shadow-sm">
              <CardContent className="flex items-center gap-2 p-3 min-w-0 sm:gap-3 sm:p-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 sm:size-10">
                  <CreditCard className="size-4 text-emerald-600 sm:size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold tabular-nums leading-tight sm:text-lg md:text-xl">
                    {stats.totalReceivedFormatted}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                    {stats.paymentsReceived} payment
                    {stats.paymentsReceived !== 1 ? "s" : ""} received
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="size-5" />
            Your vehicles
          </CardTitle>
          <CardDescription>
            Tap a vehicle to view its details, documents, invoices and payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: card list */}
          <div className="flex flex-col divide-y md:hidden">
            {vehicles.map((v) => {
              const docCount = allDocuments.filter((d) => d.vehicleId === v.id).length;
              const vehicleInvoices = allInvoices.filter((i) => i.vehicleId === v.id);
              const paidCount = vehicleInvoices.filter((i) => i.paymentStatus === "PAID").length;
              const partialCount = vehicleInvoices.filter((i) => i.paymentStatus === "PARTIALLY_PAID").length;
              const dueCount = vehicleInvoices.filter((i) => i.paymentStatus === "PENDING").length;
              const overdueCount = vehicleInvoices.filter((i) => i.paymentStatus === "OVERDUE").length;
              return (
                <Link
                  key={v.id}
                  href={`/vehicles/${v.id}`}
                  className="flex min-h-[44px] items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/30 active:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {v.make} {v.model}
                      {v.year != null ? ` ${v.year}` : ""}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{v.vin}</span>
                      <span>·</span>
                      <span>{formatDate(v.purchaseDate)}</span>
                      {v.currentShippingStage && (
                        <>
                          <span>·</span>
                          <Badge variant="secondary" className="text-xs font-normal">
                            {stageLabels[v.currentShippingStage]}
                          </Badge>
                        </>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {vehicleInvoices.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No invoices</span>
                      ) : (
                        <>
                          {paidCount > 0 && <Badge variant="default" className="text-xs font-normal">{paidCount} paid</Badge>}
                          {partialCount > 0 && <Badge variant="secondary" className="text-xs font-normal">{partialCount} partial</Badge>}
                          {dueCount > 0 && <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-500/50">{dueCount} due</Badge>}
                          {overdueCount > 0 && <Badge variant="destructive" className="text-xs font-normal">{overdueCount} overdue</Badge>}
                        </>
                      )}
                      <span className="text-xs text-muted-foreground">{docCount} docs</span>
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
          {/* Desktop: table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Vehicle</th>
                  <th className="text-left p-4 font-medium">VIN</th>
                  <th className="text-left p-4 font-medium">Purchase date</th>
                  <th className="text-left p-4 font-medium">Stage</th>
                  <th className="text-left p-4 font-medium">Documents</th>
                  <th className="text-left p-4 font-medium">Invoice status</th>
                  <th className="w-[100px] p-4" />
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => {
                  const docCount = allDocuments.filter((d) => d.vehicleId === v.id).length;
                  const vehicleInvoices = allInvoices.filter((i) => i.vehicleId === v.id);
                  const paidCount = vehicleInvoices.filter((i) => i.paymentStatus === "PAID").length;
                  const partialCount = vehicleInvoices.filter((i) => i.paymentStatus === "PARTIALLY_PAID").length;
                  const dueCount = vehicleInvoices.filter((i) => i.paymentStatus === "PENDING").length;
                  const overdueCount = vehicleInvoices.filter((i) => i.paymentStatus === "OVERDUE").length;
                  return (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="font-medium">
                          {v.make} {v.model}
                          {v.year != null ? ` ${v.year}` : ""}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm text-muted-foreground">{v.vin}</td>
                      <td className="p-4 text-sm text-muted-foreground">{formatDate(v.purchaseDate)}</td>
                      <td className="p-4">
                        {v.currentShippingStage ? (
                          <Badge variant="secondary">{stageLabels[v.currentShippingStage]}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                      <td className="p-4 text-sm tabular-nums">{docCount}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5 text-sm">
                          {vehicleInvoices.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <>
                              {paidCount > 0 && <Badge variant="default" className="font-normal">{paidCount} paid</Badge>}
                              {partialCount > 0 && <Badge variant="secondary" className="font-normal">{partialCount} partial</Badge>}
                              {dueCount > 0 && <Badge variant="outline" className="font-normal text-amber-600 border-amber-500/50">{dueCount} due</Badge>}
                              {overdueCount > 0 && <Badge variant="destructive" className="font-normal">{overdueCount} overdue</Badge>}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/vehicles/${v.id}`}
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "inline-flex items-center gap-1")}
                        >
                          View
                          <ChevronRight className="size-4 shrink-0" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
