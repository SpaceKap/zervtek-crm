"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { staffDisplayName } from "@/lib/staff-display";
import { getInvoiceTotalWithTax } from "@/lib/invoice-utils";
import Link from "next/link";
import { format } from "date-fns";
import { ShippingStage, PaymentStatus, InvoiceStatus, TransactionDirection } from "@prisma/client";
import { AddTransactionDialog } from "@/components/AddTransactionDialog";
import { CustomerForm } from "@/components/CustomerForm";

const HOW_FOUND_US_LABELS: Record<string, string> = {
  JCT: "Japanese Car Trade (JCT)",
  SEARCH_ENGINE: "Search Engine",
  SOCIAL_MEDIA: "Social Media",
  REFERRAL: "Referral",
  WEBSITE: "Website / Contact form",
  TRADE_SHOW: "Trade show / Event",
  OTHER: "Other",
};

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  billingAddress: any;
  shippingAddress: any;
  portOfDestination: string | null;
  howFoundUs: string | null;
  notes: string | null;
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  vehicles: Array<{
    id: string;
    vin: string;
    make: string | null;
    model: string | null;
    year: number | null;
    currentShippingStage: ShippingStage | null;
    purchaseDate: Date | null;
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      status: InvoiceStatus;
      paymentStatus: PaymentStatus;
      issueDate: Date;
      dueDate: Date | null;
      finalizedAt: Date | null;
    }>;
    shippingStage: {
      yard: {
        id: string;
        name: string;
      } | null;
    } | null;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: InvoiceStatus;
    paymentStatus: PaymentStatus;
    issueDate: Date;
    dueDate: Date | null;
    finalizedAt: Date | null;
    taxEnabled?: boolean;
    taxRate?: number | null;
    vehicle: {
      id: string;
      vin: string;
      make: string | null;
      model: string | null;
      year: number | null;
    };
    charges: Array<{
      id: string;
      description: string;
      amount: any;
      chargeType: {
        name: string;
      } | null;
    }>;
  }>;
  transactions: Array<{
    id: string;
    direction: string;
    type: string;
    amount: any;
    currency: string;
    date: Date;
    description: string | null;
    vehicle: {
      id: string;
      vin: string;
      make: string | null;
      model: string | null;
      year: number | null;
    } | null;
    vendor: {
      id: string;
      name: string;
    } | null;
    invoiceId: string | null;
    referenceNumber: string | null;
  }>;
  documents: Array<{
    id: string;
    name: string;
    category: string;
    fileUrl: string;
    fileType: string | null;
    fileSize: number | null;
    description: string | null;
    createdAt: Date;
    vehicle: {
      id: string;
      vin: string;
      make: string | null;
      model: string | null;
      year: number | null;
    };
  }>;
}

const stageLabels: Record<ShippingStage, string> = {
  PURCHASE: "Purchase",
  TRANSPORT: "Transport",
  REPAIR: "Repair",
  DOCUMENTS: "Documents",
  BOOKING: "Booking",
  SHIPPED: "Shipped",
  DHL: "Completed",
};

const stageColors: Record<ShippingStage, string> = {
  PURCHASE:
    "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800",
  TRANSPORT:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
  REPAIR:
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
  DOCUMENTS:
    "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
  BOOKING:
    "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800",
  SHIPPED:
    "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800",
  DHL: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
};

const paymentStatusColors: Record<PaymentStatus, string> = {
  PENDING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300",
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300",
  PARTIALLY_PAID:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300",
};

const invoiceStatusColors: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300",
  PENDING_APPROVAL:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300",
  APPROVED: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
  FINALIZED:
    "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 bg-gray-200 dark:bg-[#2C2C2C] rounded-lg"></div>
      <div className="h-96 bg-gray-200 dark:bg-[#2C2C2C] rounded-lg"></div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const customerId = params.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | undefined>(undefined);
  const [staff, setStaff] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [assignSaving, setAssignSaving] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);

  const canAssignCustomer =
    session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  useEffect(() => {
    if (canAssignCustomer) {
      fetch("/api/users?excludeRole=ACCOUNTANT")
        .then((r) => (r.ok ? r.json() : []))
        .then(setStaff)
        .catch(() => setStaff([]));
    }
  }, [canAssignCustomer]);

  const handleAssignChange = async (userId: string | null) => {
    if (!customer) return;
    setAssignSaving(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: userId || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCustomer(updated);
      } else {
        const d = await res.json();
        alert(d.error || "Failed to update assignment");
      }
    } catch {
      alert("Failed to update assignment");
    } finally {
      setAssignSaving(false);
    }
  };

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      console.log(`[Customer Page] Fetching customer with ID: ${customerId}`);
      const response = await fetch(`/api/customers/${customerId}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        console.log(
          `[Customer Page] Customer fetched successfully:`,
          data.name,
        );
        setCustomer(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          "[Customer Page] Failed to fetch customer:",
          response.status,
          errorData,
        );

        // If customer not found, try to search by name (in case ID is wrong)
        if (response.status === 404 && errorData.suggestion) {
          console.log("[Customer Page] Suggestion:", errorData.suggestion);
        }
        if (response.status === 500) {
          console.error("[Customer Page] Server error details:", errorData);
        }
      }
    } catch (error) {
      console.error("[Customer Page] Error fetching customer:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#2C2C2C] flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl text-gray-400">
              error_outline
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Customer Not Found
            </h2>
            <p className="text-gray-500 dark:text-[#A1A1A1] mb-2">
              The customer with ID &quot;{customerId}&quot; doesn&apos;t exist
              or has been removed.
            </p>
            <p className="text-sm text-gray-400 dark:text-[#666] mb-6">
              Check the browser console for more details. You can also search
              for customers in{" "}
              <Link
                href="/dashboard/financial-operations?section=customers"
                className="text-primary dark:text-[#D4AF37] hover:underline"
              >
                Financial Operations
              </Link>
              .
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => router.push("/dashboard/financial-operations?section=customers")}>
              <span className="material-symbols-outlined text-lg mr-2">
                person
              </span>
              Back to Customers
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              <span className="material-symbols-outlined text-lg mr-2">
                arrow_back
              </span>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: any, currency: string = "JPY") => {
    const numAmount =
      typeof amount === "string"
        ? parseFloat(amount)
        : parseFloat(amount?.toString() || "0");
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDocumentCategory = (category: string): string => {
    const categoryMap: Record<string, string> = {
      INVOICE: "Invoice",
      PHOTOS: "Photos",
      EXPORT_CERTIFICATE: "Export Certificate",
      DEREGISTRATION_CERTIFICATE: "Deregistration Certificate",
      INSURANCE_REFUND: "Insurance Refund",
      SHIPPING_INSTRUCTIONS: "Shipping Instructions (SI)",
      SHIPPING_ORDER: "Shipping Order (SO)",
      BILL_OF_LADING: "Bill of Lading (BL)",
      LETTER_OF_CREDIT: "Letter of Credit (LC)",
      EXPORT_DECLARATION: "Export Declaration",
      RECYCLE_APPLICATION: "Recycle Application",
      DHL_TRACKING: "DHL Tracking",
      RELEASED_BILL_OF_LADING: "Released Bill of Lading (B/L)",
      AUCTION_SHEET: "Auction Sheet",
      OTHER: "Other",
    };
    return categoryMap[category] || category.replace(/_/g, " ");
  };

  const shouldShowCategory = (
    documentName: string,
    category: string,
  ): boolean => {
    const formattedCategory = formatDocumentCategory(category);
    const nameLower = documentName.toLowerCase().trim();
    const categoryLower = formattedCategory.toLowerCase().trim();

    // Remove common abbreviations in parentheses for comparison (e.g., "(BL)", "(SI)", "(SO)")
    const categoryWithoutAbbr = categoryLower
      .replace(/\s*\([^)]+\)\s*/g, "")
      .trim();
    const nameWithoutAbbr = nameLower.replace(/\s*\([^)]+\)\s*/g, "").trim();

    // Check if name contains the category (without abbreviations)
    if (
      nameWithoutAbbr.includes(categoryWithoutAbbr) ||
      categoryWithoutAbbr.includes(nameWithoutAbbr)
    ) {
      return false;
    }

    // Check word-by-word: if all significant words from category are in the name
    const categoryWords = categoryWithoutAbbr
      .split(/\s+/)
      .filter((w) => w.length > 2); // Filter out short words
    const nameWords = nameWithoutAbbr.split(/\s+/);

    if (categoryWords.length > 0) {
      const allWordsMatch = categoryWords.every((catWord) =>
        nameWords.some(
          (nameWord) =>
            nameWord.includes(catWord) || catWord.includes(nameWord),
        ),
      );
      if (allWordsMatch) {
        return false;
      }
    }

    return true;
  };

  const totalInvoices = customer.invoices.length;
  const totalVehicles = customer.vehicles.length;
  const totalTransactions = customer.transactions.length;
  const totalDocuments = customer.documents.length;

  const totalPaid = customer.transactions
    .filter((t) => t.direction === "INCOMING")
    .reduce((sum, t) => sum + parseFloat(t.amount?.toString() || "0"), 0);

  const totalOutstanding = customer.invoices
    .filter(
      (inv) =>
        inv.paymentStatus === "PENDING" ||
        inv.paymentStatus === "PARTIALLY_PAID",
    )
    .reduce((sum, inv) => sum + getInvoiceTotalWithTax(inv), 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => router.push("/dashboard")}
          className="hover:text-foreground transition-colors"
        >
          Dashboard
        </button>
        <span className="material-symbols-outlined text-sm opacity-70">chevron_right</span>
        <Link
          href="/dashboard/financial-operations?section=customers"
          className="hover:text-foreground transition-colors"
        >
          Customers
        </Link>
        <span className="material-symbols-outlined text-sm opacity-70">chevron_right</span>
        <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">
          {customer.name}
        </span>
      </nav>

      {/* Profile header: avatar, name, contact, actions */}
      <Card className="overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4 min-w-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 dark:from-[#D4AF37]/20 dark:to-[#D4AF37]/5 flex items-center justify-center flex-shrink-0 border border-border">
                <span className="material-symbols-outlined text-primary text-2xl">person</span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">
                  {customer.name}
                </h1>
                <div className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground">
                  {customer.email && (
                    <a
                      href={`mailto:${customer.email}`}
                      className="flex items-center gap-2 hover:text-primary transition-colors truncate"
                    >
                      <span className="material-symbols-outlined text-base shrink-0">mail</span>
                      <span className="truncate">{customer.email}</span>
                    </a>
                  )}
                  {customer.phone && (
                    <a
                      href={`tel:${customer.phone}`}
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-base shrink-0">phone</span>
                      {customer.phone}
                    </a>
                  )}
                  {customer.country && (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base shrink-0">public</span>
                      {customer.country}
                    </div>
                  )}
                  {customer.portOfDestination && (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base shrink-0">anchor</span>
                      Port of destination: <span className="font-medium text-foreground">{customer.portOfDestination}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {canAssignCustomer ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Assigned:</span>
                      <Select
                        value={customer.assignedTo?.id ?? "none"}
                        onValueChange={(v) => handleAssignChange(v === "none" ? null : v)}
                        disabled={assignSaving}
                      >
                        <SelectTrigger className="h-8 w-[160px] sm:w-[180px] border-border bg-muted/30">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not assigned</SelectItem>
                          {staff.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {staffDisplayName(u.name, u.email)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    customer.assignedTo && (
                      <span className="text-sm text-muted-foreground">
                        Assigned to {customer.assignedTo.name || customer.assignedTo.email}
                      </span>
                    )
                  )}
                  {customer.howFoundUs && (
                    <Badge variant="secondary" className="font-normal text-xs">
                      {HOW_FOUND_US_LABELS[customer.howFoundUs] ?? customer.howFoundUs}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditCustomerOpen(true)}>
                <span className="material-symbols-outlined text-lg mr-1.5">edit</span>
                Edit Customer
              </Button>
              {session?.user?.role === "ADMIN" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={async () => {
                    if (!confirm("Permanently delete this customer? All their vehicles, invoices, and transactions will be removed.")) return;
                    try {
                      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Failed to delete");
                      router.push("/dashboard/financial-operations?section=customers");
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "Failed to delete customer");
                    }
                  }}
                >
                  <span className="material-symbols-outlined text-lg mr-1">delete</span>
                  Delete
                </Button>
              )}
              <Link href={`/dashboard/invoices/new?customerId=${customer.id}`}>
                <Button size="sm">
                  <span className="material-symbols-outlined text-lg mr-1.5">receipt</span>
                  Create Invoice
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vehicles</p>
              <p className="text-lg font-semibold text-foreground mt-0.5">{totalVehicles}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Invoices</p>
              <p className="text-lg font-semibold text-foreground mt-0.5">{totalInvoices}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total paid</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400 mt-0.5 tabular-nums">
                {formatCurrency(totalPaid)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outstanding</p>
              <p className="text-lg font-semibold text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">
                {formatCurrency(totalOutstanding)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="vehicles" className="space-y-4">
        <TabsList className="w-full sm:w-auto h-auto flex flex-wrap gap-1 p-1 bg-muted/50 rounded-lg">
          <TabsTrigger value="vehicles">
            <span className="material-symbols-outlined text-lg mr-2">
              directions_car
            </span>
            Vehicles ({totalVehicles})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <span className="material-symbols-outlined text-lg mr-2">
              receipt
            </span>
            Invoices ({totalInvoices})
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <span className="material-symbols-outlined text-lg mr-2">
              payments
            </span>
            Transactions ({totalTransactions})
          </TabsTrigger>
          <TabsTrigger value="documents">
            <span className="material-symbols-outlined text-lg mr-2">
              description
            </span>
            Documents ({totalDocuments})
          </TabsTrigger>
          <TabsTrigger value="details">
            <span className="material-symbols-outlined text-lg mr-2">info</span>
            Details
          </TabsTrigger>
        </TabsList>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="space-y-4 mt-4">
          {customer.vehicles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-400 mb-4">
                  directions_car
                </span>
                <p className="text-gray-500 dark:text-[#A1A1A1]">
                  No vehicles found for this customer.
                </p>
              </CardContent>
            </Card>
          ) : (
            customer.vehicles.map((vehicle) => (
              <Card key={vehicle.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">
                        {vehicle.make && vehicle.model && vehicle.year
                          ? `${vehicle.make} ${vehicle.model} ${vehicle.year}`
                          : "Unknown Vehicle"}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">
                        VIN: {vehicle.vin}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {vehicle.currentShippingStage && (
                        <Badge
                          className={`${stageColors[vehicle.currentShippingStage]} border`}
                        >
                          {stageLabels[vehicle.currentShippingStage]}
                        </Badge>
                      )}
                      <Link href={`/dashboard/vehicles/${vehicle.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-1">
                        Purchase Date
                      </div>
                      <div className="font-medium">
                        {vehicle.purchaseDate
                          ? format(new Date(vehicle.purchaseDate), "PPP")
                          : "N/A"}
                      </div>
                    </div>
                    {vehicle.shippingStage?.yard && (
                      <div>
                        <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-1">
                          Storage Yard
                        </div>
                        <div className="font-medium">
                          {vehicle.shippingStage.yard.name}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-1">
                        Invoices ({vehicle.invoices.length})
                      </div>
                      <div className="space-y-1">
                        {vehicle.invoices.map((invoice) => (
                          <Link
                            key={invoice.id}
                            href={`/dashboard/invoices/${invoice.id}`}
                            className="block text-sm text-primary dark:text-[#D4AF37] hover:underline"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4 mt-4">
          {customer.invoices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-400 mb-4">
                  receipt
                </span>
                <p className="text-gray-500 dark:text-[#A1A1A1] mb-4">
                  No invoices found for this customer.
                </p>
                <Link
                  href={`/dashboard/invoices/new?customerId=${customer.id}`}
                >
                  <Button>
                    <span className="material-symbols-outlined text-lg mr-2">
                      add
                    </span>
                    Create Invoice
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            customer.invoices.map((invoice) => {
              const totalAmount = getInvoiceTotalWithTax(invoice);
              return (
                <Card key={invoice.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">
                          Invoice {invoice.invoiceNumber}
                        </CardTitle>
                        <CardDescription>
                          {invoice.vehicle
                            ? (
                                <>
                                  {invoice.vehicle.make &&
                                    invoice.vehicle.model &&
                                    invoice.vehicle.year &&
                                    `${invoice.vehicle.make} ${invoice.vehicle.model} ${invoice.vehicle.year}`}
                                  {invoice.vehicle.vin && (
                                    <span className="ml-2 font-mono text-xs">
                                      ({invoice.vehicle.vin})
                                    </span>
                                  )}
                                </>
                              )
                            : "Container/Shipping"}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`${invoiceStatusColors[invoice.status]} border`}
                        >
                          {invoice.status.replace("_", " ")}
                        </Badge>
                        <Badge
                          className={`${paymentStatusColors[invoice.paymentStatus]} border`}
                        >
                          {invoice.paymentStatus.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-1">
                          Issue Date
                        </div>
                        <div className="font-medium">
                          {format(new Date(invoice.issueDate), "PPP")}
                        </div>
                      </div>
                      {invoice.dueDate && (
                        <div>
                          <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-1">
                            Due Date
                          </div>
                          <div className="font-medium">
                            {format(new Date(invoice.dueDate), "PPP")}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-1">
                          Total Amount
                        </div>
                        <div className="font-bold text-lg">
                          {formatCurrency(totalAmount)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/invoices/${invoice.id}`}>
                        <Button variant="outline" size="sm">
                          View Invoice
                        </Button>
                      </Link>
                      {invoice.vehicle && (
                        <Link href={`/dashboard/vehicles/${invoice.vehicle.id}`}>
                          <Button variant="outline" size="sm">
                            View Vehicle
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoiceId(invoice.id);
                          setSelectedVehicleId(invoice.vehicle?.id);
                          setTransactionDialogOpen(true);
                        }}
                      >
                        <span className="material-symbols-outlined text-base mr-1">
                          payments
                        </span>
                        Mark Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Transaction History</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setSelectedVehicleId(undefined);
                  setSelectedInvoiceId(undefined);
                  setTransactionDialogOpen(true);
                }}
              >
                <span className="material-symbols-outlined text-lg mr-2">
                  payments
                </span>
                Add Payment
              </Button>
            </div>
          </div>

          {/* Combined Transaction History */}
          <div className="space-y-4">
            {/* Invoices Section */}
            {customer.invoices.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">
                    receipt
                  </span>
                  Invoices ({customer.invoices.length})
                </h4>
                <div className="space-y-2">
                  {customer.invoices.map((invoice) => {
                    const totalAmount = getInvoiceTotalWithTax(invoice);
                    return (
                      <Card key={`invoice-${invoice.id}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">INVOICE</Badge>
                                <Badge
                                  className={`${invoiceStatusColors[invoice.status]} border`}
                                >
                                  {invoice.status.replace("_", " ")}
                                </Badge>
                                <Badge
                                  className={`${paymentStatusColors[invoice.paymentStatus]} border`}
                                >
                                  {invoice.paymentStatus.replace("_", " ")}
                                </Badge>
                              </div>
                              <div className="font-semibold text-lg mb-1">
                                Invoice {invoice.invoiceNumber}
                              </div>
                              {invoice.vehicle && (
                                <p className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-2">
                                  Vehicle: {invoice.vehicle.make}{" "}
                                  {invoice.vehicle.model} ({invoice.vehicle.vin})
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-[#A1A1A1] flex-wrap">
                                <span>
                                  Issue Date:{" "}
                                  {format(new Date(invoice.issueDate), "PPP")}
                                </span>
                                {invoice.dueDate && (
                                  <span>
                                    Due Date:{" "}
                                    {format(new Date(invoice.dueDate), "PPP")}
                                  </span>
                                )}
                                <span className="font-semibold">
                                  Total: {formatCurrency(totalAmount)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link href={`/dashboard/invoices/${invoice.id}`}>
                                <Button variant="outline" size="sm">
                                  View Invoice
                                </Button>
                              </Link>
                              {invoice.vehicle && (
                                <Link
                                  href={`/dashboard/vehicles/${invoice.vehicle.id}`}
                                >
                                  <Button variant="outline" size="sm">
                                    View Vehicle
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Transactions Section */}
            {customer.transactions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">
                    account_balance
                  </span>
                  Payments & Costs ({customer.transactions.length})
                </h4>
                <div className="space-y-2">
                  {customer.transactions.map((transaction) => (
                    <Card key={transaction.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant={
                                  transaction.direction === "INCOMING"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {transaction.direction}
                              </Badge>
                              <Badge variant="outline">{transaction.type}</Badge>
                            </div>
                            <div className="font-semibold text-lg mb-1">
                              {formatCurrency(
                                transaction.amount,
                                transaction.currency,
                              )}
                            </div>
                            {transaction.description && (
                              <p className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-2">
                                {transaction.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-[#A1A1A1] flex-wrap">
                              <span>
                                {format(new Date(transaction.date), "PPP")}
                              </span>
                              {transaction.vehicle && (
                                <Link
                                  href={`/dashboard/vehicles/${transaction.vehicle.id}`}
                                  className="hover:text-primary dark:hover:text-[#D4AF37] transition-colors"
                                >
                                  Vehicle: {transaction.vehicle.make}{" "}
                                  {transaction.vehicle.model} (
                                  {transaction.vehicle.vin})
                                </Link>
                              )}
                              {transaction.invoiceId && (
                                <Link
                                  href={`/dashboard/invoices/${transaction.invoiceId}`}
                                  className="hover:text-primary dark:hover:text-[#D4AF37] transition-colors"
                                >
                                  View Invoice
                                </Link>
                              )}
                              {transaction.referenceNumber && (
                                <span>Ref: {transaction.referenceNumber}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {customer.invoices.length === 0 &&
              customer.transactions.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-400 mb-4">
                      payments
                    </span>
                    <p className="text-gray-500 dark:text-[#A1A1A1]">
                      No transactions or invoices found for this customer.
                    </p>
                  </CardContent>
                </Card>
              )}
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4 mt-4">
          {customer.documents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-400 mb-4">
                  description
                </span>
                <p className="text-gray-500 dark:text-[#A1A1A1]">
                  No documents found for this customer&apos;s vehicles.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customer.documents.map((document) => (
                <Card key={document.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{document.name}</CardTitle>
                    <CardDescription>
                      {document.vehicle.make &&
                        document.vehicle.model &&
                        document.vehicle.year &&
                        `${document.vehicle.make} ${document.vehicle.model} ${document.vehicle.year}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {shouldShowCategory(document.name, document.category) && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-[#A1A1A1]">
                            Category:
                          </span>
                          <Badge variant="outline">
                            {formatDocumentCategory(document.category)}
                          </Badge>
                        </div>
                      )}
                      {document.fileSize && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-[#A1A1A1]">
                            Size:
                          </span>
                          <span>{formatFileSize(document.fileSize)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-[#A1A1A1]">
                          Uploaded:
                        </span>
                        <span>
                          {format(new Date(document.createdAt), "PPP")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <a
                          href={document.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <span className="material-symbols-outlined text-base mr-2">
                              open_in_new
                            </span>
                            View
                          </Button>
                        </a>
                        <Link
                          href={`/dashboard/vehicles/${document.vehicle.id}`}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <span className="material-symbols-outlined text-base mr-2">
                              directions_car
                            </span>
                            Vehicle
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-1">
                    Name
                  </div>
                  <div className="font-medium">{customer.name}</div>
                </div>
                {customer.email && (
                  <div>
                    <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-1">
                      Email
                    </div>
                    <div className="font-medium">{customer.email}</div>
                  </div>
                )}
                {customer.phone && (
                  <div>
                    <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-1">
                      Phone
                    </div>
                    <div className="font-medium">{customer.phone}</div>
                  </div>
                )}
                {customer.country && (
                  <div>
                    <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-1">
                      Country
                    </div>
                    <div className="font-medium">{customer.country}</div>
                  </div>
                )}
                {customer.portOfDestination && (
                  <div>
                    <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-1">
                      Port of Destination
                    </div>
                    <div className="font-medium">
                      {customer.portOfDestination}
                    </div>
                  </div>
                )}
                {canAssignCustomer ? (
                  <div>
                    <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-1">
                      Assigned To
                    </div>
                    <Select
                      value={customer.assignedTo?.id ?? "none"}
                      onValueChange={(v) =>
                        handleAssignChange(v === "none" ? null : v)
                      }
                      disabled={assignSaving}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not assigned</SelectItem>
                        {staff.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {staffDisplayName(u.name, u.email)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  customer.assignedTo && (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-1">
                        Assigned To
                      </div>
                      <div className="font-medium">
                        {customer.assignedTo.name || customer.assignedTo.email}
                      </div>
                    </div>
                  )
                )}
              </div>
              {customer.billingAddress && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-2">
                    Billing Address
                  </div>
                  <div className="bg-gray-50 dark:bg-[#2C2C2C] p-3 rounded-lg">
                    {typeof customer.billingAddress === "object" ? (
                      <div className="space-y-1">
                        {customer.billingAddress.street && (
                          <div>{customer.billingAddress.street}</div>
                        )}
                        {(customer.billingAddress.city ||
                          customer.billingAddress.state ||
                          customer.billingAddress.zip) && (
                          <div>
                            {[
                              customer.billingAddress.city,
                              customer.billingAddress.state,
                              customer.billingAddress.zip,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        )}
                        {customer.billingAddress.country && (
                          <div>{customer.billingAddress.country}</div>
                        )}
                      </div>
                    ) : (
                      <div>{String(customer.billingAddress)}</div>
                    )}
                  </div>
                </div>
              )}
              {customer.shippingAddress && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-2">
                    Shipping Address
                  </div>
                  <div className="bg-gray-50 dark:bg-[#2C2C2C] p-3 rounded-lg">
                    {typeof customer.shippingAddress === "object" ? (
                      <div className="space-y-1">
                        {customer.shippingAddress.street && (
                          <div>{customer.shippingAddress.street}</div>
                        )}
                        {(customer.shippingAddress.city ||
                          customer.shippingAddress.state ||
                          customer.shippingAddress.zip) && (
                          <div>
                            {[
                              customer.shippingAddress.city,
                              customer.shippingAddress.state,
                              customer.shippingAddress.zip,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        )}
                        {customer.shippingAddress.country && (
                          <div>{customer.shippingAddress.country}</div>
                        )}
                      </div>
                    ) : (
                      <div>{String(customer.shippingAddress)}</div>
                    )}
                  </div>
                </div>
              )}
              {customer.notes && (
                <div>
                  <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-2">
                    Notes
                  </div>
                  <div className="bg-gray-50 dark:bg-[#2C2C2C] p-3 rounded-lg whitespace-pre-wrap">
                    {customer.notes}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        open={transactionDialogOpen}
        onOpenChange={(open) => {
          setTransactionDialogOpen(open);
          if (!open) {
            setSelectedVehicleId(undefined);
            setSelectedInvoiceId(undefined);
          }
        }}
        onSuccess={() => {
          fetchCustomer();
        }}
        defaultDirection="INCOMING"
        defaultVehicleId={selectedVehicleId}
        defaultCustomerId={customerId}
        defaultInvoiceId={selectedInvoiceId}
      />

      {editCustomerOpen && customer && (
        <CustomerForm
          customer={{
            ...customer,
            assignedToId: (customer as any).assignedTo?.id ?? (customer as any).assignedToId,
          } as any}
          onClose={() => {
            setEditCustomerOpen(false);
            fetchCustomer();
          }}
        />
      )}
    </div>
  );
}
