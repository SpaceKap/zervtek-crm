"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShippingStage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { VehicleStageForms } from "@/components/VehicleStageForms";
import { VehicleDocumentsManager } from "@/components/VehicleDocumentsManager";
import { VehiclePaymentTracker } from "@/components/VehiclePaymentTracker";
import { VehicleStageHistory } from "@/components/VehicleStageHistory";
import { VehicleExpensesManager } from "@/components/VehicleExpensesManager";
import { StageNavigation } from "@/components/StageNavigation";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface Vendor {
  id: string;
  name: string;
  email: string | null;
}

interface Yard {
  id: string;
  name: string;
  vendor: Vendor | null;
}

interface Vehicle {
  id: string;
  vin: string;
  stockNo: string | null;
  chassisNo: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  auctionHouse: string | null;
  lotNo: string | null;
  purchaseDate: Date | null;
  currentShippingStage: ShippingStage | null;
  isRegistered: boolean | null;
  inquiryId: string | null;
  inquiry: {
    id: string;
    customerName: string | null;
    status: string;
  } | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone?: string | null;
  } | null;
  shippingStage: any;
  stageHistory: any[];
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    costInvoice?: {
      totalCost: any;
      totalRevenue: any;
      profit: any;
      costItems?: Array<{ description: string; amount: any; category: string | null }>;
    } | null;
  }>;
  _count?: {
    documents: number;
    stageCosts: number;
  };
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

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-48 bg-muted rounded-xl" />
      <div className="h-96 bg-muted rounded-xl" />
    </div>
  );
}

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const vehicleId = params.id as string;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [yards, setYards] = useState<Yard[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStage, setSavingStage] = useState(false);
  const [viewingStage, setViewingStage] = useState<ShippingStage | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [assignCustomerOpen, setAssignCustomerOpen] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string; email: string | null }[]>([]);
  const [assigningCustomerId, setAssigningCustomerId] = useState("");
  const [assigningLoading, setAssigningLoading] = useState(false);

  const fetchVendors = useCallback(async () => {
    try {
      const response = await fetch("/api/vendors");
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  }, []);

  const fetchYards = useCallback(async () => {
    try {
      const response = await fetch("/api/yards", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setYards(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch yards:", response.status, errorData);
      }
    } catch (error) {
      console.error("Error fetching yards:", error);
    }
  }, []);

  const fetchVehicle = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vehicles/${vehicleId}/stages`);
      if (response.ok) {
        const data = await response.json();
        setVehicle(data);
        setViewingStage((prev) => prev || data.currentShippingStage || ShippingStage.PURCHASE);
      }
    } catch (error) {
      console.error("Error fetching vehicle:", error);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (vehicleId) {
      fetchVehicle();
      fetchVendors();
      fetchYards();
    }
  }, [vehicleId, fetchVehicle, fetchVendors, fetchYards]);

  useEffect(() => {
    if (viewingStage && vehicle) {
      fetchVendors();
    }
  }, [viewingStage, vehicle, fetchVendors]);

  useEffect(() => {
    if (assignCustomerOpen) {
      fetch("/api/customers")
        .then((r) => r.ok && r.json())
        .then((data) => Array.isArray(data) && setCustomers(data))
        .catch(() => {});
    }
  }, [assignCustomerOpen]);

  const handleAssignCustomer = async () => {
    if (!assigningCustomerId) return;
    try {
      setAssigningLoading(true);
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: assigningCustomerId }),
      });
      if (res.ok) {
        setAssignCustomerOpen(false);
        setAssigningCustomerId("");
        fetchVehicle();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to assign customer");
      }
    } catch (e) {
      alert("Failed to assign customer");
    } finally {
      setAssigningLoading(false);
    }
  };

  const handleStageChange = async (newStage: ShippingStage) => {
    try {
      setSavingStage(true);
      const response = await fetch(`/api/vehicles/${vehicleId}/stages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });

      if (response.ok) {
        fetchVehicle();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error changing stage:", error);
      alert("Failed to change stage");
    } finally {
      setSavingStage(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-4xl text-muted-foreground">
              error_outline
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Vehicle Not Found
            </h2>
            <p className="text-muted-foreground">
              The vehicle you&apos;re looking for doesn&apos;t exist or has been
              removed.
            </p>
          </div>
          <Button
            onClick={() =>
              router.push("/dashboard/financial-operations?section=vehicles")
            }
            size="lg"
            className="gap-2"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Vehicles
          </Button>
        </div>
      </div>
    );
  }

  const vehicleTitle =
    vehicle.make && vehicle.model && vehicle.year
      ? `${vehicle.make} ${vehicle.model} ${vehicle.year}`
      : vehicle.vin || "Unknown Vehicle";

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border border-slate-700/50 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="hover:text-white transition-colors"
            >
              Dashboard
            </button>
            <span className="material-symbols-outlined text-sm opacity-60">
              chevron_right
            </span>
            <button
              onClick={() =>
                router.push("/dashboard/financial-operations?section=vehicles")
              }
              className="hover:text-white transition-colors"
            >
              Vehicles
            </button>
            <span className="material-symbols-outlined text-sm opacity-60">
              chevron_right
            </span>
            <span className="text-slate-200 truncate max-w-[200px] sm:max-w-none">
              {vehicleTitle}
            </span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-white text-3xl">
                  directions_car
                </span>
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1">
                  {vehicleTitle}
                </h1>
                <p className="font-mono text-sm text-slate-400 mb-3">
                  {vehicle.vin}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-slate-400">Make:</span>
                  <span className="text-slate-200 font-medium">
                    {vehicle.make || "—"}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">Model:</span>
                  <span className="text-slate-200 font-medium">
                    {vehicle.model || "—"}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">Year:</span>
                  <span className="text-slate-200 font-medium">
                    {vehicle.year || "—"}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">Registration:</span>
                  <span className="text-slate-200 font-medium">
                    {vehicle.isRegistered === null
                      ? "Unknown"
                      : vehicle.isRegistered
                        ? "Registered"
                        : "Not Registered"}
                  </span>
                </div>
                {vehicle.customer ? (
                  <Link
                    href={`/dashboard/customers/${vehicle.customer.id}`}
                    className="inline-flex items-center gap-1.5 mt-3 text-amber-400 hover:text-amber-300 transition-colors text-sm font-medium"
                  >
                    <span className="material-symbols-outlined text-base">
                      person
                    </span>
                    {vehicle.customer.name}
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5 border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                    onClick={() => setAssignCustomerOpen(true)}
                  >
                    <span className="material-symbols-outlined text-base">
                      person_add
                    </span>
                    Assign Customer
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
              {vehicle.currentShippingStage && (
                <Badge
                  className={`${stageColors[vehicle.currentShippingStage]} border-0 text-sm font-semibold px-3 py-1`}
                >
                  {stageLabels[vehicle.currentShippingStage]}
                </Badge>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab("documents")}
                className="gap-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 border-0"
              >
                <span className="material-symbols-outlined text-lg">
                  upload_file
                </span>
                Upload Document
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab("expenses")}
                className="gap-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 border-0"
              >
                <span className="material-symbols-outlined text-lg">
                  receipt_long
                </span>
                Add Expense
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab("payments")}
                className="gap-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 border-0"
              >
                <span className="material-symbols-outlined text-lg">
                  payments
                </span>
                Add Payment
              </Button>
              {session?.user?.role === "ADMIN" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-400 shrink-0"
                  onClick={async () => {
                    if (!confirm("Permanently delete this vehicle? All related invoices, documents, and costs will be removed.")) return;
                    try {
                      const res = await fetch(`/api/vehicles/${vehicleId}`, { method: "DELETE" });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Failed to delete");
                      router.push("/dashboard/financial-operations?section=vehicles");
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "Failed to delete vehicle");
                    }
                  }}
                >
                  <span className="material-symbols-outlined text-lg mr-1">delete</span>
                  Delete Vehicle
                </Button>
              )}
              {vehicle.invoices && vehicle.invoices.length > 0 ? (
                <Link href={`/dashboard/invoices/${vehicle.invoices[0].id}`}>
                  <Button
                    size="sm"
                    className="gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 border-0 shadow-lg"
                  >
                    <span className="material-symbols-outlined text-lg">receipt</span>
                    View Invoice
                  </Button>
                </Link>
              ) : (
                <Link
                  href={`/dashboard/invoices/new?vehicleId=${vehicle.id}${vehicle.customer ? `&customerId=${vehicle.customer.id}` : ""}`}
                >
                  <Button
                    size="sm"
                    className="gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 border-0 shadow-lg"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Create Invoice
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stage Pipeline */}
      <Card>
        <CardHeader className="pb-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl text-muted-foreground">
                    settings
                  </span>
                  Stage Management
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Configure stage-specific settings and requirements
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">
                  Current Stage:
                </Label>
                <Select
                  value={vehicle.currentShippingStage || "PURCHASE"}
                  onValueChange={(value) =>
                    handleStageChange(value as ShippingStage)
                  }
                  disabled={savingStage}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(stageLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {viewingStage && (
              <div className="pt-4 border-t">
                <StageNavigation
                  currentStage={vehicle.currentShippingStage}
                  viewingStage={viewingStage}
                  onViewingStageChange={setViewingStage}
                  disabled={savingStage}
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {viewingStage ? (
            <VehicleStageForms
              vehicleId={vehicleId}
              currentStage={viewingStage}
              stageData={vehicle.shippingStage}
              vendors={vendors}
              yards={yards}
              isRegistered={vehicle.isRegistered}
              vehicle={{
                vin: vehicle.vin,
                stockNo: vehicle.stockNo,
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                chassisNo: vehicle.chassisNo,
                auctionHouse: vehicle.auctionHouse,
                lotNo: vehicle.lotNo,
                purchaseDate: vehicle.purchaseDate,
              }}
              onUpdate={fetchVehicle}
            />
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-muted-foreground">
                  info
                </span>
              </div>
              <p className="text-muted-foreground mb-4">
                Please select a shipping stage first
              </p>
              <Select
                value={viewingStage || "PURCHASE"}
                onValueChange={(value) => {
                  setViewingStage(value as ShippingStage);
                }}
                disabled={savingStage}
              >
                <SelectTrigger className="w-48 mx-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(stageLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Section - Below Stage Pipeline */}
      <div className="space-y-0">
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          {/* Underline-style tab navigation */}
          <nav
            className="flex gap-8 border-b border-border overflow-x-auto pb-px"
            aria-label="Vehicle details"
          >
            {[
              { id: "expenses", label: "Expenses", icon: "receipt_long" },
              { id: "payments", label: "Payments", icon: "payments" },
              { id: "documents", label: "Documents", icon: "folder" },
              { id: "history", label: "History", icon: "history" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 text-sm font-medium whitespace-nowrap
                  border-b-2 -mb-px transition-colors
                  ${
                    activeTab === tab.id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                <span className="material-symbols-outlined text-lg">
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <div className="pt-6">
            <TabsContent value="overview" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer card */}
                <div className="lg:col-span-2">
                  <div className="rounded-xl border bg-card p-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                      Customer & Location
                    </h3>
                    {vehicle.customer ? (
                      <Link
                        href={`/dashboard/customers/${vehicle.customer.id}`}
                        className="block group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                            {vehicle.customer.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {vehicle.customer.name}
                            </p>
                            {vehicle.customer.email && (
                              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                                {vehicle.customer.email}
                              </p>
                            )}
                            {vehicle.customer.phone && (
                              <p className="text-sm text-muted-foreground truncate">
                                {vehicle.customer.phone}
                              </p>
                            )}
                            <span className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-primary">
                              View profile
                              <span className="material-symbols-outlined text-base">
                                arrow_forward
                              </span>
                            </span>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 py-4 text-muted-foreground">
                        <span className="material-symbols-outlined text-2xl">
                          person_off
                        </span>
                        <p className="text-sm">No customer assigned</p>
                      </div>
                    )}
                    {vehicle.inquiry && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-1">
                          Source inquiry
                        </p>
                        <Link
                          href={`/dashboard/inquiries/${vehicle.inquiry.id}`}
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {vehicle.inquiry.customerName || "Inquiry"}
                          <span className="text-muted-foreground ml-1">
                            ({vehicle.inquiry.status})
                          </span>
                        </Link>
                      </div>
                    )}
                    {vehicle.shippingStage?.yard && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-1">
                          Storage yard
                        </p>
                        <p className="text-sm font-medium">
                          {vehicle.shippingStage.yard.name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoices card - view only */}
                <div>
                  <div className="rounded-xl border bg-card p-6 h-full">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                      Invoices
                    </h3>
                    {vehicle.invoices && vehicle.invoices.length > 0 ? (
                      <div className="space-y-4">
                        <ul className="space-y-2">
                          {vehicle.invoices.map((invoice) => (
                            <li key={invoice.id}>
                              <Link
                                href={`/dashboard/invoices/${invoice.id}`}
                                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 border bg-background hover:bg-muted/50 transition-colors group"
                              >
                                <span className="font-medium text-sm">
                                  {invoice.invoiceNumber}
                                </span>
                                <span className="material-symbols-outlined text-muted-foreground text-lg group-hover:text-primary transition-colors">
                                  arrow_forward
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                        {(() => {
                          const invoicesWithCosts = vehicle.invoices?.filter(
                            (inv) => inv.costInvoice && (parseFloat(inv.costInvoice.totalRevenue?.toString() || "0") > 0 || parseFloat(inv.costInvoice.totalCost?.toString() || "0") > 0)
                          ) || [];
                          if (invoicesWithCosts.length === 0) return null;
                          const totalRevenue = invoicesWithCosts.reduce(
                            (s, inv) => s + parseFloat(inv.costInvoice?.totalRevenue?.toString() || "0"),
                            0
                          );
                          const totalCost = invoicesWithCosts.reduce(
                            (s, inv) => s + parseFloat(inv.costInvoice?.totalCost?.toString() || "0"),
                            0
                          );
                          const totalProfit = invoicesWithCosts.reduce(
                            (s, inv) => s + parseFloat(inv.costInvoice?.profit?.toString() || "0"),
                            0
                          );
                          const fmt = (n: number) =>
                            new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(n);
                          return (
                            <div className="pt-4 border-t space-y-1 text-sm">
                              <div className="flex justify-between text-muted-foreground">
                                <span>Revenue</span>
                                <span>{fmt(totalRevenue)}</span>
                              </div>
                              <div className="flex justify-between text-muted-foreground">
                                <span>Costs</span>
                                <span>{fmt(totalCost)}</span>
                              </div>
                              <div className="flex justify-between font-medium">
                                <span>Profit</span>
                                <span className={totalProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                  {fmt(totalProfit)}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <span className="material-symbols-outlined text-3xl text-muted-foreground/50 mb-2">
                          receipt_long
                        </span>
                        <p className="text-sm text-muted-foreground">
                          No invoices yet
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="expenses" className="mt-0">
              <div className="rounded-xl border bg-card p-6">
                <VehicleExpensesManager
                  vehicleId={vehicleId}
                  onUpdate={fetchVehicle}
                />
              </div>
            </TabsContent>

            <TabsContent value="payments" className="mt-0">
              <div className="rounded-xl border bg-card p-6">
                <VehiclePaymentTracker vehicleId={vehicleId} />
              </div>
            </TabsContent>

            <TabsContent value="documents" className="mt-0">
              <div className="rounded-xl border bg-card p-6">
                <VehicleDocumentsManager
                  vehicleId={vehicleId}
                  currentStage={vehicle.currentShippingStage}
                />
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <div className="rounded-xl border bg-card p-6">
                <VehicleStageHistory vehicleId={vehicleId} />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Assign Customer Dialog */}
      <Dialog open={assignCustomerOpen} onOpenChange={setAssignCustomerOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">person_add</span>
              Assign Customer
            </DialogTitle>
            <DialogDescription>
              Select a customer to assign to this vehicle
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={assigningCustomerId}
              onValueChange={setAssigningCustomerId}
              disabled={assigningLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.email ? ` (${c.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignCustomerOpen(false)}
              disabled={assigningLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignCustomer}
              disabled={!assigningCustomerId || assigningLoading}
            >
              {assigningLoading ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
