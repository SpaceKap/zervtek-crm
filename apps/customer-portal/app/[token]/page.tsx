import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  Car,
  FileText,
  Receipt,
  Package,
  Ship,
  Calendar,
  MapPin,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortalClient } from "./portal-client";

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

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const customer = await prisma.customer.findUnique({
    where: { shareToken: token },
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

  const [vehicles, invoices, transactions] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        OR: [
          { customerId: customer.id },
          { customerLinks: { some: { customerId: customer.id } } },
        ],
      },
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        vin: true,
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
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: {
        customerId: customer.id,
        status: "FINALIZED",
      },
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
      orderBy: { issueDate: "desc" },
    }),
    prisma.transaction.findMany({
      where: { customerId: customer.id, direction: "INCOMING" },
      select: {
        id: true,
        date: true,
        amount: true,
        currency: true,
        description: true,
        type: true,
        invoiceId: true,
        invoice: {
          select: { invoiceNumber: true },
        },
      },
      orderBy: { date: "desc" },
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

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {customer.name}
              </h1>
              <p className="text-muted-foreground text-sm">
                Vehicle tracking portal
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2">
              <Car className="size-4 text-primary" />
              <span className="text-sm font-medium">
                {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {vehicles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Car className="text-muted-foreground mb-4 size-12" />
              <h2 className="text-xl font-semibold">No vehicles yet</h2>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Your vehicles will appear here once they are added to the
                system.
              </p>
            </CardContent>
          </Card>
        ) : (
          <PortalClient
            customer={customer}
            vehicles={vehicles}
            transactions={transactions}
            allDocuments={allDocuments}
            allInvoices={allInvoices}
            stageLabels={STAGE_LABELS}
            stageOrder={STAGE_ORDER}
          />
        )}
      </main>
    </div>
  );
}
