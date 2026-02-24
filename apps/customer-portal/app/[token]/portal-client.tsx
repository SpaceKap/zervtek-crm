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
      {/* Overview stats – compact equal-height cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="overflow-hidden border-muted/50">
          <CardContent className="flex items-center gap-3 p-3 sm:p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:size-10">
              <Car className="size-4 text-primary sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-semibold tabular-nums sm:text-2xl">{stats.vehicles}</p>
              <p className="truncate text-xs text-muted-foreground">Vehicles</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-muted/50">
          <CardContent className="flex items-center gap-3 p-3 sm:p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 sm:size-10">
              <Ship className="size-4 text-blue-600 sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-semibold tabular-nums sm:text-2xl">{stats.inTransit}</p>
              <p className="truncate text-xs text-muted-foreground">In transit</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-muted/50">
          <CardContent className="flex items-center gap-3 p-3 sm:p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 sm:size-10">
              <FileText className="size-4 text-amber-600 sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-semibold tabular-nums sm:text-2xl">{stats.documents}</p>
              <p className="truncate text-xs text-muted-foreground">Documents</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-muted/50">
          <CardContent className="flex items-center gap-3 p-3 sm:p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 sm:size-10">
              <Receipt className="size-4 text-emerald-600 sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-semibold tabular-nums sm:text-2xl">{stats.invoices}</p>
              <p className="truncate text-xs text-muted-foreground">Invoices</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial summary – single row that wraps */}
      {(stats.unpaidInvoices > 0 ||
        stats.overdueInvoices > 0 ||
        (stats.paymentsReceived > 0 && stats.totalReceivedFormatted)) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {stats.overdueInvoices > 0 && (
            <Card className="overflow-hidden border-destructive/30 bg-destructive/5">
              <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 sm:size-10">
                  <AlertCircle className="size-4 text-destructive sm:size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xl font-semibold tabular-nums text-destructive sm:text-2xl">
                    {stats.overdueInvoices}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Overdue invoice{stats.overdueInvoices !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {stats.unpaidInvoices > 0 && stats.overdueInvoices !== stats.unpaidInvoices && (
            <Card className="overflow-hidden border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 sm:size-10">
                  <Receipt className="size-4 text-amber-600 sm:size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xl font-semibold tabular-nums sm:text-2xl">{stats.unpaidInvoices}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Unpaid invoice{stats.unpaidInvoices !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {stats.paymentsReceived > 0 && stats.totalReceivedFormatted && (
            <Card className="overflow-hidden border-muted/50">
              <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 sm:size-10">
                  <CreditCard className="size-4 text-emerald-600 sm:size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold tabular-nums leading-tight sm:text-xl">
                    {stats.totalReceivedFormatted}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
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
            Click a vehicle to view its details, documents, invoices and payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
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
                  const docCount = allDocuments.filter(
                    (d) => d.vehicleId === v.id
                  ).length;
                  const vehicleInvoices = allInvoices.filter(
                    (i) => i.vehicleId === v.id
                  );
                  const paidCount = vehicleInvoices.filter(
                    (i) => i.paymentStatus === "PAID"
                  ).length;
                  const partialCount = vehicleInvoices.filter(
                    (i) => i.paymentStatus === "PARTIALLY_PAID"
                  ).length;
                  const dueCount = vehicleInvoices.filter(
                    (i) => i.paymentStatus === "PENDING"
                  ).length;
                  const overdueCount = vehicleInvoices.filter(
                    (i) => i.paymentStatus === "OVERDUE"
                  ).length;
                  return (
                    <tr
                      key={v.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-medium">
                          {v.make} {v.model}
                          {v.year != null ? ` ${v.year}` : ""}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm text-muted-foreground">
                        {v.vin}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(v.purchaseDate)}
                      </td>
                      <td className="p-4">
                        {v.currentShippingStage ? (
                          <Badge variant="secondary">
                            {stageLabels[v.currentShippingStage]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            —
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm tabular-nums">
                        {docCount}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5 text-sm">
                          {vehicleInvoices.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <>
                              {paidCount > 0 && (
                                <Badge variant="default" className="font-normal">
                                  {paidCount} paid
                                </Badge>
                              )}
                              {partialCount > 0 && (
                                <Badge variant="secondary" className="font-normal">
                                  {partialCount} partial
                                </Badge>
                              )}
                              {dueCount > 0 && (
                                <Badge variant="outline" className="font-normal text-amber-600 border-amber-500/50">
                                  {dueCount} due
                                </Badge>
                              )}
                              {overdueCount > 0 && (
                                <Badge variant="destructive" className="font-normal">
                                  {overdueCount} overdue
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/vehicles/${v.id}`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "inline-flex items-center gap-1"
                          )}
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
