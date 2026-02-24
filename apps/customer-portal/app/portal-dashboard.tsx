import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PortalClient } from "@/app/[token]/portal-client";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

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

const vehicleSelect = {
  id: true,
  make: true,
  model: true,
  year: true,
  vin: true,
  purchaseDate: true,
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
      yard: { select: { name: true } },
    },
  },
  documents: {
    where: { visibleToCustomer: true },
    select: {
      id: true,
      name: true,
      category: true,
      fileUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

export async function PortalDashboard({
  customerId,
}: {
  customerId: string;
}) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      country: true,
      billingAddress: true,
      shippingAddress: true,
      portOfDestination: true,
    },
  });

  if (!customer) notFound();

  const customerEmail = customer.email?.trim().toLowerCase();
  const customerIdsToShow = customerEmail
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
    : [customerId];

  const invoiceWhere = {
    status: { in: ["APPROVED", "FINALIZED"] as const },
    customerId: { in: customerIdsToShow },
  };

  const [vehicles, invoices, transactions] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        OR: [
          { customerId },
          { customerLinks: { some: { customerId } } },
        ],
      },
      select: vehicleSelect,
      orderBy: { createdAt: "desc" as const },
    }),
    prisma.invoice.findMany({
      where: invoiceWhere,
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        dueDate: true,
        paymentStatus: true,
        vehicleId: true,
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
          },
        },
        charges: {
          select: { description: true, amount: true },
        },
      },
      orderBy: { issueDate: "desc" as const },
    }),
    prisma.transaction.findMany({
      where: { customerId, direction: "INCOMING" as const },
      select: {
        id: true,
        date: true,
        amount: true,
        currency: true,
        description: true,
        type: true,
        invoiceId: true,
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: { date: "desc" as const },
    }),
  ]);

  const allDocuments = vehicles.flatMap((v) =>
    v.documents.map((d) => ({ ...d, vehicleId: v.id, vehicle: v }))
  );
  const allInvoices = invoices.map((inv) => ({
    ...inv,
    vehicleId: inv.vehicleId ?? undefined,
    vehicle: inv.vehicle ?? undefined,
  }));

  const inTransitStages = ["BOOKING", "SHIPPED", "DHL"] as const;
  const inTransitCount = vehicles.filter((v) =>
    v.currentShippingStage &&
    inTransitStages.includes(v.currentShippingStage as (typeof inTransitStages)[number])
  ).length;

  const unpaidInvoices = allInvoices.filter(
    (inv) => inv.paymentStatus !== "PAID" && inv.paymentStatus !== "CANCELLED"
  );
  const overdueCount = unpaidInvoices.filter((inv) => {
    if (!inv.dueDate) return false;
    return new Date(inv.dueDate) < new Date();
  }).length;

  const totalReceivedByCurrency: Record<string, number> = {};
  for (const tx of transactions) {
    const c = (tx.currency ?? "JPY") as string;
    totalReceivedByCurrency[c] = (totalReceivedByCurrency[c] ?? 0) + Number(tx.amount ?? 0);
  }
  const totalReceivedFormatted =
    Object.entries(totalReceivedByCurrency).length === 0
      ? null
      : Object.entries(totalReceivedByCurrency)
          .map(([currency, sum]) => {
            const sym = currency === "JPY" ? "¥" : currency === "USD" ? "$" : `${currency} `;
            return `${sym}${Number(sum).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
          })
          .join(", ");

  const stats = {
    vehicles: vehicles.length,
    inTransit: inTransitCount,
    documents: allDocuments.length,
    invoices: allInvoices.length,
    unpaidInvoices: unpaidInvoices.length,
    overdueInvoices: overdueCount,
    paymentsReceived: transactions.length,
    totalReceivedFormatted,
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {customer.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              Vehicle tracking portal
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"
              )}
            >
              My profile
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {vehicles.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              No vehicles linked yet. Your vehicles will appear here once they
              are assigned to your account.
            </p>
          </div>
        ) : (
          <PortalClient
            customer={customer}
            vehicles={vehicles}
            transactions={transactions}
            allDocuments={allDocuments}
            allInvoices={allInvoices}
            stageLabels={STAGE_LABELS}
            stageOrder={STAGE_ORDER}
            stats={stats}
          />
        )}
      </main>
    </div>
  );
}
