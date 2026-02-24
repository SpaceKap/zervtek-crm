import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { format } from "date-fns";
import {
  Car,
  FileText,
  Receipt,
  Package,
  Ship,
  MapPin,
  CreditCard,
  ExternalLink,
  Check,
  ArrowLeft,
  Download,
  Calendar,
  Hash,
  CircleDot,
  Image as ImageIcon,
} from "lucide-react";
import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MediaGridWithPreview } from "@/components/MediaGridWithPreview";

const STAGE_LABELS: Record<string, string> = {
  PURCHASE: "Purchase",
  TRANSPORT: "Transport",
  REPAIR: "Repair & Storage",
  DOCUMENTS: "Documents",
  BOOKING: "Booking",
  SHIPPED: "Shipped",
  DHL: "Completed",
};

const STAGE_ORDER = [
  "PURCHASE",
  "TRANSPORT",
  "REPAIR",
  "DOCUMENTS",
  "BOOKING",
  "SHIPPED",
  "DHL",
];

const ACCESSORY_LABELS: { key: string; label: string }[] = [
  { key: "spareKeysReceived", label: "Spare keys" },
  { key: "maintenanceRecordsReceived", label: "Maintenance records" },
  { key: "manualsReceived", label: "Manuals" },
  { key: "cataloguesReceived", label: "Catalogues" },
  { key: "accessoriesReceived", label: "Accessories" },
  { key: "otherItemsReceived", label: "Other items" },
];

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy");
}

function invoiceTotal(inv: {
  charges: Array<{ amount: unknown }>;
  taxEnabled?: boolean | null;
  taxRate?: unknown;
}): number {
  const sum =
    inv.charges?.reduce((s, c) => s + Number(c.amount ?? 0), 0) ?? 0;
  if (inv.taxEnabled && inv.taxRate != null) {
    const rate = parseFloat(String(inv.taxRate));
    return sum + sum * (rate / 100);
  }
  return sum;
}

/** Sort invoices: due/overdue first (by due date), then partially paid, then paid (newest first). */
function sortInvoicesForDisplay<T extends { paymentStatus: string; dueDate?: Date | null; issueDate?: Date | null }>(
  invoices: T[]
): T[] {
  const statusOrder = (s: string) =>
    s === "OVERDUE" ? 0 : s === "PARTIALLY_PAID" ? 1 : s === "PAID" ? 2 : 0; // due/other = 0
  return [...invoices].sort((a, b) => {
    const aOrder = statusOrder(a.paymentStatus);
    const bOrder = statusOrder(b.paymentStatus);
    if (aOrder !== bOrder) return aOrder - bOrder;
    if (a.paymentStatus !== "PAID" && b.paymentStatus !== "PAID") {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return aDue - bDue; // soonest due first
    }
    const aDate = a.issueDate ? new Date(a.issueDate).getTime() : 0;
    const bDate = b.issueDate ? new Date(b.issueDate).getTime() : 0;
    return bDate - aDate; // newest first for paid
  });
}

export default async function VehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: vehicleId } = await params;
  const session = await getServerSession(authOptions);
  const customerId = session?.user?.id;
  const customerEmail = session?.user?.email?.trim().toLowerCase();
  if (!customerId) {
    redirect("/login");
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      OR: [
        { customerId: customerId as string },
        { customerLinks: { some: { customerId: customerId as string } } },
      ],
    },
    select: {
      id: true,
      make: true,
      model: true,
      year: true,
      vin: true,
      notes: true,
      currentShippingStage: true,
      shippingStage: {
        select: {
          stage: true,
          spareKeysReceived: true,
          maintenanceRecordsReceived: true,
          manualsReceived: true,
          cataloguesReceived: true,
          accessoriesReceived: true,
          otherItemsReceived: true,
          bookingType: true,
          bookingStatus: true,
          bookingNumber: true,
          pod: true,
          pol: true,
          vesselName: true,
          voyageNo: true,
          etd: true,
          eta: true,
          containerNumber: true,
          containerSize: true,
          dhlTracking: true,
        },
      },
      documents: {
        where: { visibleToCustomer: true },
        select: {
          id: true,
          name: true,
          category: true,
          fileType: true,
          fileUrl: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!vehicle) notFound();

  // Resolve all customer IDs that match (logged-in customer + any customer with same email, e.g. from admin)
  const customerIdsToShow =
    customerEmail
      ? await prisma.customer
          .findMany({
            where: {
              OR: [
                { id: customerId },
                { email: { equals: customerEmail, mode: "insensitive" } },
              ],
            },
            select: { id: true },
          })
          .then((rows) => rows.map((r) => r.id))
      : [customerId as string];

  // Invoices: APPROVED or FINALIZED for this vehicle, under any of the matching customers
  const invoiceWhere = {
    status: { in: [InvoiceStatus.APPROVED, InvoiceStatus.FINALIZED] },
    vehicleId: vehicle.id,
    customerId: { in: customerIdsToShow },
  };

  const [invoicesRaw, transactions, companyInfo] = await Promise.all([
    prisma.invoice.findMany({
      where: invoiceWhere,
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        dueDate: true,
        paymentStatus: true,
        wisePaymentLink: true,
        shareToken: true,
        taxEnabled: true,
        taxRate: true,
        charges: { select: { description: true, amount: true } },
      },
      orderBy: { issueDate: "desc" },
    }),
    prisma.transaction.findMany({
      where: {
        direction: "INCOMING",
        invoice: {
          vehicleId: vehicle.id,
          status: { in: [InvoiceStatus.APPROVED, InvoiceStatus.FINALIZED] },
          customerId: { in: customerIdsToShow },
        },
      },
      select: {
        id: true,
        invoiceId: true,
        date: true,
        amount: true,
        currency: true,
        description: true,
        type: true,
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.companyInfo.findFirst({
      select: { bankDetails1: true },
    }),
  ]);

  // Ensure share tokens exist for finalized invoices (for PDF links)
  const invoices = await Promise.all(
    invoicesRaw.map(async (inv) => {
      if (inv.shareToken) return inv;
      const { randomBytes } = await import("crypto");
      let shareToken = randomBytes(32).toString("base64url");
      let isUnique = false;
      while (!isUnique) {
        const existing = await prisma.invoice.findUnique({
          where: { shareToken },
          select: { id: true },
        });
        if (!existing) {
          isUnique = true;
        } else {
          shareToken = randomBytes(32).toString("base64url");
        }
      }
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { shareToken },
      });
      return { ...inv, shareToken };
    })
  );

  const stageIndex = vehicle.currentShippingStage
    ? STAGE_ORDER.indexOf(vehicle.currentShippingStage)
    : -1;
  const progress =
    stageIndex >= 0 ? ((stageIndex + 1) / STAGE_ORDER.length) * 100 : 0;

  const mainAppUrl =
    process.env.NEXT_PUBLIC_MAIN_APP_URL ||
    process.env.MAIN_APP_URL ||
    "http://localhost:3000";

  const stage = vehicle.shippingStage as any;
  const hasAnyAccessory = stage && ACCESSORY_LABELS.some(({ key }) => stage[key] === true);
  const mediaDocs = vehicle.documents.filter((d) => d.category === "PHOTOS");
  const otherDocs = vehicle.documents.filter((d) => d.category !== "PHOTOS");
  const hasBookingDetails =
    stage &&
    !!(
      stage.bookingStatus ||
      stage.bookingNumber ||
      stage.pol ||
      stage.pod ||
      stage.vesselName ||
      stage.etd ||
      stage.eta ||
      stage.containerNumber
    );

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2")}
          >
            <ArrowLeft className="size-4" />
            Back to vehicles
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold truncate">
              {vehicle.make} {vehicle.model}
              {vehicle.year != null && ` ${vehicle.year}`}
            </h1>
            <p className="text-muted-foreground text-sm font-mono">
              {vehicle.vin}
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Shipping progress */}
        {vehicle.currentShippingStage && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Shipping progress</span>
                <Badge
                  variant={
                    vehicle.currentShippingStage === "DHL" ? "default" : "secondary"
                  }
                >
                  {STAGE_LABELS[vehicle.currentShippingStage]}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Progress</span>
                <span className="font-semibold text-primary">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                {STAGE_ORDER.map((s) => (
                  <span key={s}>{STAGE_LABELS[s]}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main row: Invoice (3/4) | Documents + Notes (1/4) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left 3/4: Invoice embedded with payments and status */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="size-5" />
                  Invoice{invoices.length !== 1 ? "s" : ""} &amp; payments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {invoices.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No finalized invoices for this vehicle yet.
                  </p>
                ) : (
                  <>
                    {invoices.length > 1 && (() => {
                      const dueCount = invoices.filter(
                        (inv) =>
                          inv.paymentStatus !== "PAID" &&
                          inv.paymentStatus !== "CANCELLED"
                      ).length;
                      const dueTotal = invoices
                        .filter(
                          (inv) =>
                            inv.paymentStatus !== "PAID" &&
                            inv.paymentStatus !== "CANCELLED"
                        )
                        .reduce((sum, inv) => sum + invoiceTotal(inv), 0);
                      const paidCount = invoices.filter(
                        (inv) => inv.paymentStatus === "PAID"
                      ).length;
                      const parts = [
                        `${invoices.length} invoices`,
                        dueCount > 0
                          ? `${dueCount} due${dueTotal > 0 ? ` (¥${dueTotal.toLocaleString()})` : ""}`
                          : null,
                        paidCount > 0 ? `${paidCount} paid` : null,
                      ].filter(Boolean);
                      return (
                        <p className="text-sm text-muted-foreground border-b pb-3">
                          {parts.join(" · ")}
                        </p>
                      );
                    })()}
                    {sortInvoicesForDisplay(invoices).map((inv) => {
                    const total = invoiceTotal(inv);
                    const invTransactions = transactions.filter(
                      (tx) => tx.invoiceId === inv.id
                    );
                    const isPaid = inv.paymentStatus === "PAID";
                    const isOverdue = inv.paymentStatus === "OVERDUE";
                    const isPartial = inv.paymentStatus === "PARTIALLY_PAID";
                    const invoicePageUrl =
                      inv.shareToken &&
                      `${mainAppUrl}/invoice/${inv.shareToken}`;
                    const pdfUrl =
                      inv.shareToken &&
                      `${mainAppUrl}/api/invoices/public/${inv.shareToken}/pdf?download=true`;
                    const wiseUrl =
                      !isPaid &&
                      inv.paymentStatus !== "CANCELLED" &&
                      inv.wisePaymentLink
                        ? (() => {
                            try {
                              const baseUrl = inv.wisePaymentLink!.split("?")[0];
                              const params = new URLSearchParams();
                              params.append("amount", total.toFixed(2));
                              params.append("currency", "JPY");
                              params.append("description", `Invoice ${inv.invoiceNumber}`);
                              return `${baseUrl}?${params.toString()}`;
                            } catch {
                              return inv.wisePaymentLink!;
                            }
                          })()
                        : null;
                    const statusLabel =
                      isPaid
                        ? "Paid"
                        : isOverdue
                          ? "Overdue"
                          : isPartial
                            ? "Partially paid"
                            : "Due";
                    return (
                      <div
                        key={inv.id}
                        className="rounded-lg border p-4 space-y-4 bg-card"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            {invoices.length > 1 && (
                              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                                Invoice
                              </div>
                            )}
                            <div className="font-semibold">
                              {inv.invoiceNumber}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Issued {formatDate(inv.issueDate)}
                              {inv.dueDate && ` · Due ${formatDate(inv.dueDate)}`}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={
                                isPaid
                                  ? "default"
                                  : isOverdue
                                    ? "destructive"
                                    : isPartial
                                      ? "secondary"
                                      : "outline"
                              }
                            >
                              {statusLabel}
                            </Badge>
                            {pdfUrl && (
                              <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="Download PDF"
                              >
                                <Download className="size-4" />
                              </a>
                            )}
                            {invoicePageUrl && (
                              <a
                                href={invoicePageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="View full invoice"
                              >
                                <ExternalLink className="size-4" />
                              </a>
                            )}
                          </div>
                        </div>
                        {/* Charges summary */}
                        <div className="text-sm">
                          {inv.charges?.length ? (
                            <ul className="space-y-1">
                              {inv.charges.map((c, i) => (
                                <li
                                  key={i}
                                  className="flex justify-between gap-2"
                                >
                                  <span className="text-muted-foreground truncate">
                                    {c.description || "Charge"}
                                  </span>
                                  <span className="tabular-nums shrink-0">
                                    ¥{Number(c.amount ?? 0).toLocaleString()}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
                            <span>Total</span>
                            <span>¥{total.toLocaleString()}</span>
                          </div>
                        </div>
                        {/* Payments for this invoice */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Payments
                          </p>
                          {invTransactions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No payments recorded yet.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {invTransactions.map((tx) => (
                                <li
                                  key={tx.id}
                                  className="flex justify-between items-center text-sm rounded border px-3 py-2 bg-muted/30"
                                >
                                  <span>
                                    {tx.currency} {Number(tx.amount).toLocaleString()}
                                    {tx.description && (
                                      <span className="text-muted-foreground ml-1">
                                        · {tx.description}
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    {formatDate(tx.date)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {/* Pay with Wise per invoice (for due invoices with a Wise link) */}
                        {wiseUrl && (
                          <div className="pt-2 border-t">
                            <a
                              href={wiseUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00B9FF] hover:bg-[#0099CC] text-white text-sm font-medium"
                            >
                              Pay with Wise
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </>
                )}
                {/* Bank details (Pay with Wise is per invoice above) */}
                {invoices.some(
                  (inv) =>
                    inv.paymentStatus !== "PAID" &&
                    inv.paymentStatus !== "CANCELLED"
                ) &&
                  (() => {
                    const bd =
                      companyInfo?.bankDetails1 &&
                      (typeof companyInfo.bankDetails1 === "string"
                        ? JSON.parse(companyInfo.bankDetails1 as string)
                        : companyInfo.bankDetails1) as Record<string, string> | null;
                    if (!bd) return null;
                    return (
                      <div className="rounded-lg bg-muted/50 p-4 border space-y-4">
                        <p className="text-sm font-semibold">Bank transfer details</p>
                        <dl className="grid gap-1 text-sm">
                          {bd.name && (
                            <>
                              <dt className="text-muted-foreground">Bank name</dt>
                              <dd className="font-mono">{bd.name}</dd>
                            </>
                          )}
                          {bd.accountName && (
                            <>
                              <dt className="text-muted-foreground">Account name</dt>
                              <dd>{bd.accountName}</dd>
                            </>
                          )}
                          {bd.accountNo && (
                            <>
                              <dt className="text-muted-foreground">Account number</dt>
                              <dd className="font-mono">{bd.accountNo}</dd>
                            </>
                          )}
                          {bd.swiftCode && (
                            <>
                              <dt className="text-muted-foreground">SWIFT code</dt>
                              <dd className="font-mono">{bd.swiftCode}</dd>
                            </>
                          )}
                        </dl>
                      </div>
                    );
                  })()}
              </CardContent>
            </Card>

            {/* Booking / ship – 4-column grid with icons */}
            {hasBookingDetails && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Ship className="size-5" />
                    Booking / ship
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {stage.bookingStatus && (
                      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                        <CircleDot className="size-5 shrink-0 text-muted-foreground mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
                          <p className="text-sm font-medium truncate">{stage.bookingStatus}</p>
                        </div>
                      </div>
                    )}
                    {stage.bookingNumber && (
                      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                        <Hash className="size-5 shrink-0 text-muted-foreground mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Booking #</p>
                          <p className="text-sm font-medium truncate">{stage.bookingNumber}</p>
                        </div>
                      </div>
                    )}
                    {stage.pol && (
                      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                        <MapPin className="size-5 shrink-0 text-muted-foreground mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">POL</p>
                          <p className="text-sm font-medium truncate">{stage.pol}</p>
                        </div>
                      </div>
                    )}
                    {stage.pod && (
                      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                        <MapPin className="size-5 shrink-0 text-muted-foreground mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">POD</p>
                          <p className="text-sm font-medium truncate">{stage.pod}</p>
                        </div>
                      </div>
                    )}
                    {stage.vesselName && (
                      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3 sm:col-span-2">
                        <Ship className="size-5 shrink-0 text-muted-foreground mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vessel</p>
                          <p className="text-sm font-medium">
                            {stage.vesselName}
                            {stage.voyageNo && <span className="text-muted-foreground"> / {stage.voyageNo}</span>}
                          </p>
                        </div>
                      </div>
                    )}
                    {stage.etd && (
                      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                        <Calendar className="size-5 shrink-0 text-muted-foreground mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ETD</p>
                          <p className="text-sm font-medium">{formatDate(stage.etd)}</p>
                        </div>
                      </div>
                    )}
                    {stage.eta && (
                      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                        <Calendar className="size-5 shrink-0 text-muted-foreground mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ETA</p>
                          <p className="text-sm font-medium">{formatDate(stage.eta)}</p>
                        </div>
                      </div>
                    )}
                    {stage.containerNumber && (
                      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                        <Package className="size-5 shrink-0 text-muted-foreground mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Container</p>
                          <p className="text-sm font-medium">
                            {stage.containerNumber}
                            {stage.containerSize && <span className="text-muted-foreground"> ({stage.containerSize})</span>}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Photos and Videos – left column underneath Booking/ship or Invoice */}
            {mediaDocs.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImageIcon className="size-5" aria-hidden />
                    Photos and Videos ({mediaDocs.length})
                  </CardTitle>
                  <a
                    href={`/api/vehicles/${vehicle.id}/media-archive`}
                    download
                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0")}
                    title="Download all as ZIP"
                    aria-label="Download all photos and videos as ZIP"
                  >
                    <Download className="size-5" />
                  </a>
                </CardHeader>
                <CardContent>
                  <MediaGridWithPreview mediaDocs={mediaDocs} mainAppUrl={mainAppUrl} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right 1/4: Documents, Notes, Accessories received stacked */}
          <div className="space-y-4">
            {(mediaDocs.length > 0 || otherDocs.length > 0) && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="size-5" />
                      Documents ({otherDocs.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {otherDocs.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No other documents shared for this vehicle.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {otherDocs.map((doc) => (
                          <a
                            key={doc.id}
                            href={doc.fileUrl.startsWith("http") ? doc.fileUrl : `${mainAppUrl}${doc.fileUrl.startsWith("/") ? "" : "/"}${doc.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary hover:bg-muted/50"
                          >
                            <FileText className="size-5 text-primary shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm">
                                {doc.category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                              </div>
                            </div>
                            <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                          </a>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
            {vehicle.documents.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="size-5" />
                    Documents (0)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    No documents shared for this vehicle yet.
                  </p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {vehicle.notes ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {vehicle.notes}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No notes for this vehicle.
                  </p>
                )}
              </CardContent>
            </Card>
            {/* Accessories received – stacked under Notes */}
            {hasAnyAccessory && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="size-5" />
                    Accessories received
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {ACCESSORY_LABELS.map(({ key, label }) => {
                      if (stage[key] !== true) return null;
                      return (
                        <li key={key} className="flex items-center gap-2 text-sm">
                          <Check className="size-4 text-green-600" />
                          {label}
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* DHL tracking */}
        {stage?.dhlTracking && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm">{stage.dhlTracking}</span>
                <a
                  href={`https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(
                    stage.dhlTracking
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Track on DHL
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
}
