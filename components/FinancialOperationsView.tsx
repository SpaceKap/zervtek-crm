"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CombinedInvoicesView } from "./CombinedInvoicesView";
import { AddTransactionDialog } from "./AddTransactionDialog";
import {
  TransactionDirection,
  TransactionType,
  UserRole,
} from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShippingStage } from "@prisma/client";

interface FinancialOperationsViewProps {
  currentUser: {
    id: string;
    role: UserRole;
  };
}

interface Transaction {
  id: string;
  direction: TransactionDirection;
  type: TransactionType;
  amount: string;
  currency: string;
  date: string;
  description: string | null;
  vendor: { id: string; name: string } | null;
  customer: { id: string; name: string; email: string | null } | null;
  vehicle: {
    id: string;
    vin: string;
    make: string | null;
    model: string | null;
  } | null;
  invoiceUrl: string | null;
  referenceNumber: string | null;
}

interface Vehicle {
  id: string;
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
  purchaseDate: Date | null;
  currentShippingStage: ShippingStage | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  shippingStage: {
    stage: ShippingStage;
    yard: { name: string } | null;
    etd: Date | null;
    eta: Date | null;
  } | null;
  _count: {
    documents: number;
    stageCosts: number;
  };
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
  }>;
  createdAt: string;
}

interface GeneralCost {
  id: string;
  description: string;
  amount: string;
  currency: string;
  date: string;
  vendor: { id: string; name: string; email: string | null } | null;
  invoiceUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Vendor {
  id: string;
  name: string;
  email: string | null;
}

export function FinancialOperationsView({
  currentUser,
}: FinancialOperationsViewProps) {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");

  const getInitialSection = (): "invoices" | "transactions" | "vehicles" => {
    if (sectionParam === "transactions" || sectionParam === "vehicles") {
      return sectionParam;
    }
    return "invoices";
  };

  const [activeSection, setActiveSection] = useState<
    "invoices" | "transactions" | "vehicles"
  >(getInitialSection());

  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionTab, setTransactionTab] =
    useState<TransactionDirection>("INCOMING");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  // Vehicles state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("purchaseDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [selectedVehicleDocuments, setSelectedVehicleDocuments] = useState<
    any[]
  >([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );

  // General costs state
  const [costs, setCosts] = useState<GeneralCost[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [costsLoading, setCostsLoading] = useState(false);
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<GeneralCost | null>(null);
  const [costStartDate, setCostStartDate] = useState("");
  const [costEndDate, setCostEndDate] = useState("");
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    currency: "JPY",
    date: new Date().toISOString().split("T")[0],
    vendorId: "",
    invoiceUrl: "",
    notes: "",
  });

  // Fetch transactions
  useEffect(() => {
    if (activeSection === "transactions") {
      fetchTransactions();
    }
  }, [activeSection, transactionTab, typeFilter, startDate, endDate]);

  const fetchVehicles = useCallback(async () => {
    try {
      setVehiclesLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (stageFilter !== "all") params.append("stage", stageFilter);
      if (customerFilter !== "all") params.append("customerId", customerFilter);

      const url = `/api/vehicles${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        let vehiclesList = Array.isArray(data) ? data : [];

        // Sort vehicles
        vehiclesList.sort((a: Vehicle, b: Vehicle) => {
          let aValue: any;
          let bValue: any;

          if (sortBy === "purchaseDate") {
            aValue = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
            bValue = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
          } else if (sortBy === "etd") {
            aValue = a.shippingStage?.etd
              ? new Date(a.shippingStage.etd).getTime()
              : 0;
            bValue = b.shippingStage?.etd
              ? new Date(b.shippingStage.etd).getTime()
              : 0;
          } else {
            return 0;
          }

          if (sortOrder === "asc") {
            return aValue - bValue;
          } else {
            return bValue - aValue;
          }
        });

        setVehicles(vehiclesList);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          "Failed to fetch vehicles:",
          response.status,
          response.statusText,
          errorData,
        );
        setVehicles([]);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setVehicles([]);
    } finally {
      setVehiclesLoading(false);
    }
  }, [search, stageFilter, customerFilter, sortBy, sortOrder]);

  const handleViewDocuments = async (vehicleId: string) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/documents`);
      if (response.ok) {
        const documents = await response.json();
        setSelectedVehicleDocuments(documents);
        setSelectedVehicleId(vehicleId);
        setDocumentsDialogOpen(true);
      } else {
        alert("Failed to fetch documents");
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      alert("Failed to fetch documents");
    }
  };

  // Fetch vehicles when section becomes active or filters change
  useEffect(() => {
    if (activeSection === "vehicles") {
      fetchVehicles();
    }
  }, [activeSection, fetchVehicles]);

  // Fetch general costs
  useEffect(() => {
    if (activeSection === "general-costs") {
      fetchCosts();
      fetchVendors();
    }
  }, [activeSection, costStartDate, costEndDate]);

  const fetchTransactions = async () => {
    try {
      setTransactionsLoading(true);
      const params = new URLSearchParams();
      params.append("direction", transactionTab);
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/transactions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const fetchCosts = async () => {
    try {
      setCostsLoading(true);
      const params = new URLSearchParams();
      if (costStartDate) params.append("startDate", costStartDate);
      if (costEndDate) params.append("endDate", costEndDate);

      const response = await fetch(`/api/general-costs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCosts(data);
      }
    } catch (error) {
      console.error("Error fetching general costs:", error);
    } finally {
      setCostsLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch("/api/vendors");
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  const handleOpenCostDialog = (cost?: GeneralCost) => {
    if (cost) {
      setEditingCost(cost);
      setFormData({
        description: cost.description,
        amount: cost.amount,
        currency: cost.currency,
        date: cost.date.split("T")[0],
        vendorId: cost.vendor?.id || "",
        invoiceUrl: cost.invoiceUrl || "",
        notes: cost.notes || "",
      });
    } else {
      setEditingCost(null);
      setFormData({
        description: "",
        amount: "",
        currency: "JPY",
        date: new Date().toISOString().split("T")[0],
        vendorId: "",
        invoiceUrl: "",
        notes: "",
      });
    }
    setCostDialogOpen(true);
  };

  const handleCloseCostDialog = () => {
    setCostDialogOpen(false);
    setEditingCost(null);
  };

  const handleSubmitCost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCost
        ? `/api/general-costs/${editingCost.id}`
        : "/api/general-costs";
      const method = editingCost ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: formData.description,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          date: formData.date,
          vendorId: formData.vendorId || null,
          invoiceUrl: formData.invoiceUrl || null,
          notes: formData.notes || null,
        }),
      });

      if (response.ok) {
        fetchCosts();
        handleCloseCostDialog();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save general cost");
      }
    } catch (error) {
      console.error("Error saving general cost:", error);
      alert("Failed to save general cost");
    }
  };

  const handleDeleteCost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this cost?")) return;

    try {
      const response = await fetch(`/api/general-costs/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchCosts();
      } else {
        alert("Failed to delete cost");
      }
    } catch (error) {
      console.error("Error deleting cost:", error);
      alert("Failed to delete cost");
    }
  };

  const typeLabels: Record<TransactionType, string> = {
    BANK_TRANSFER: "Bank Transfer",
    PAYPAL: "PayPal",
    CASH: "Cash",
    WISE: "Wise",
  };

  const stageLabels: Record<ShippingStage, string> = {
    PURCHASE: "Purchase",
    TRANSPORT: "Transport",
    REPAIR: "Repair",
    DOCUMENTS: "Documents",
    BOOKING: "Booking",
    SHIPPED: "Shipped",
    DHL: "DHL",
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

  const transactionTotal = transactions.reduce(
    (sum, t) => sum + parseFloat(t.amount),
    0,
  );

  const costTotal = costs.reduce((sum, c) => sum + parseFloat(c.amount), 0);

  const canViewVehicles =
    currentUser.role === UserRole.MANAGER ||
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.BACK_OFFICE_STAFF ||
    currentUser.role === UserRole.ACCOUNTANT;

  const canViewTransactions =
    currentUser.role === UserRole.MANAGER ||
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.ACCOUNTANT;

  const canViewGeneralCosts =
    currentUser.role === UserRole.MANAGER ||
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.ACCOUNTANT;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-primary dark:text-[#D4AF37]">
            account_balance_wallet
          </span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Financial Operations
            </h1>
            <p className="text-muted-foreground">
              Manage invoices, transactions, vehicles, and costs in one place
            </p>
          </div>
        </div>
      </div>

      <Tabs
        value={activeSection}
        onValueChange={(v) => setActiveSection(v as typeof activeSection)}
        className="w-full"
      >
        <TabsList
          className={`grid w-full ${(() => {
            const visibleTabs =
              1 + [canViewTransactions, canViewVehicles].filter(Boolean).length;
            return visibleTabs === 3
              ? "grid-cols-3"
              : visibleTabs === 2
                ? "grid-cols-2"
                : "grid-cols-1";
          })()}`}
        >
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">receipt</span>
            Invoices
          </TabsTrigger>
          {canViewTransactions && (
            <TabsTrigger
              value="transactions"
              className="flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">
                account_balance
              </span>
              Transactions
            </TabsTrigger>
          )}
          {canViewVehicles && (
            <TabsTrigger value="vehicles" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">
                directions_car
              </span>
              Vehicles
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="invoices" className="mt-6">
          <CombinedInvoicesView currentUser={currentUser} />
        </TabsContent>

        {canViewTransactions && (
          <TabsContent value="transactions" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Transactions
                  </h2>
                  <p className="text-muted-foreground">
                    Track all incoming and outgoing payments
                  </p>
                </div>
                <Button
                  onClick={() => setTransactionDialogOpen(true)}
                  className="inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">add</span>
                  Add Transaction
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex gap-2 border-b pb-4">
                    <button
                      onClick={() => setTransactionTab("INCOMING")}
                      className={`px-6 py-3 font-medium transition-colors ${
                        transactionTab === "INCOMING"
                          ? "border-b-2 border-primary text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Incoming Payments
                    </button>
                    <button
                      onClick={() => setTransactionTab("OUTGOING")}
                      className={`px-6 py-3 font-medium transition-colors ${
                        transactionTab === "OUTGOING"
                          ? "border-b-2 border-primary text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Outgoing Costs
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex gap-4 mb-4 flex-wrap">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="Start Date"
                      className="max-w-[200px]"
                    />
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="End Date"
                      className="max-w-[200px]"
                    />
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {Object.entries(typeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mb-4 p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      Total Amount
                    </div>
                    <div className="text-2xl font-bold">
                      {transactionTotal.toLocaleString()} JPY
                    </div>
                  </div>

                  {transactionsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading...
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-semibold">
                              Date
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">
                              Type
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">
                              Amount
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">
                              {transactionTab === "INCOMING"
                                ? "Customer"
                                : "Vendor"}
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">
                              Vehicle
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">
                              Description
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((transaction) => (
                            <tr
                              key={transaction.id}
                              className="border-b hover:bg-muted/50"
                            >
                              <td className="py-3 px-4">
                                {new Date(
                                  transaction.date,
                                ).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-1 bg-muted rounded text-sm">
                                  {typeLabels[transaction.type]}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-semibold">
                                {parseFloat(
                                  transaction.amount,
                                ).toLocaleString()}{" "}
                                {transaction.currency}
                              </td>
                              <td className="py-3 px-4">
                                {transactionTab === "INCOMING"
                                  ? transaction.customer?.name || "N/A"
                                  : transaction.vendor?.name || "N/A"}
                              </td>
                              <td className="py-3 px-4">
                                {transaction.vehicle
                                  ? `${transaction.vehicle.vin} (${transaction.vehicle.make} ${transaction.vehicle.model})`
                                  : "N/A"}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {transaction.description || "N/A"}
                                  {(transaction as any).isGeneralCost && (
                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                                      General Cost
                                    </span>
                                  )}
                                  {(transaction as any).isVehicleStageCost && (
                                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                                      Vehicle Cost
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {!(transaction as any).isGeneralCost &&
                                !(transaction as any).isVehicleStageCost ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const response = await fetch(
                                          `/api/transactions/${transaction.id}`,
                                        );
                                        if (response.ok) {
                                          const fullTransaction =
                                            await response.json();
                                          setEditingTransaction(
                                            fullTransaction,
                                          );
                                          setTransactionDialogOpen(true);
                                        } else {
                                          alert(
                                            "Failed to load transaction details",
                                          );
                                        }
                                      } catch (error) {
                                        console.error(
                                          "Error fetching transaction:",
                                          error,
                                        );
                                        alert(
                                          "Failed to load transaction details",
                                        );
                                      }
                                    }}
                                  >
                                    Edit
                                  </Button>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    View only
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <AddTransactionDialog
                open={transactionDialogOpen}
                onOpenChange={(open) => {
                  setTransactionDialogOpen(open);
                  if (!open) {
                    setEditingTransaction(null);
                  }
                }}
                onSuccess={() => {
                  fetchTransactions();
                  setEditingTransaction(null);
                }}
                defaultDirection={transactionTab}
                transaction={editingTransaction}
              />
            </div>
          </TabsContent>
        )}

        {canViewVehicles && (
          <TabsContent value="vehicles" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Vehicle Database
                  </h2>
                  <p className="text-muted-foreground">
                    Track all vehicles and their shipping stages
                  </p>
                </div>
                <Link href="/dashboard/vehicles/new">
                  <Button className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined">add</span>
                    Add Vehicle
                  </Button>
                </Link>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-4 mb-4 flex-wrap">
                    <Input
                      type="text"
                      placeholder="Search by VIN, make, or model..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && fetchVehicles()}
                      className="flex-1 min-w-[200px]"
                    />
                    <Select value={stageFilter} onValueChange={setStageFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Stages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stages</SelectItem>
                        {Object.entries(stageLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchaseDate">
                          Purchase Date
                        </SelectItem>
                        <SelectItem value="etd">ETD</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={sortOrder}
                      onValueChange={(v) => setSortOrder(v as "asc" | "desc")}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Descending</SelectItem>
                        <SelectItem value="asc">Ascending</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={fetchVehicles}>Search</Button>
                  </div>

                  {vehiclesLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading...
                    </div>
                  ) : vehicles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No vehicles found
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-semibold">
                              VIN
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">
                              Vehicle
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">
                              Customer
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">
                              Stage
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">
                              Purchase Date
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">
                              ETA
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">
                              Yard
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">
                              Documents
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">
                              Costs
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">
                              Invoice
                            </th>
                            <th className="text-left py-3 px-4 font-semibold">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {vehicles.map((vehicle) => (
                            <tr
                              key={vehicle.id}
                              className="border-b hover:bg-muted/50"
                            >
                              <td className="py-3 px-4 font-mono text-sm">
                                {vehicle.vin}
                              </td>
                              <td className="py-3 px-4">
                                {vehicle.make} {vehicle.model} {vehicle.year}
                              </td>
                              <td className="py-3 px-4">
                                {vehicle.customer?.name || "N/A"}
                              </td>
                              <td className="py-3 px-4">
                                {vehicle.currentShippingStage ? (
                                  <span
                                    className={`px-2 py-1 rounded text-sm border ${stageColors[vehicle.currentShippingStage]}`}
                                  >
                                    {stageLabels[vehicle.currentShippingStage]}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    N/A
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {vehicle.purchaseDate
                                  ? new Date(
                                      vehicle.purchaseDate,
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </td>
                              <td className="py-3 px-4">
                                {vehicle.shippingStage?.eta
                                  ? new Date(
                                      vehicle.shippingStage.eta,
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </td>
                              <td className="py-3 px-4">
                                {vehicle.shippingStage?.yard?.name || "N/A"}
                              </td>
                              <td className="py-3 px-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleViewDocuments(vehicle.id)
                                  }
                                  disabled={vehicle._count.documents === 0}
                                >
                                  <span className="material-symbols-outlined text-sm mr-1">
                                    description
                                  </span>
                                  View ({vehicle._count.documents})
                                </Button>
                              </td>
                              <td className="py-3 px-4">
                                {vehicle._count.stageCosts}
                              </td>
                              <td className="py-3 px-4">
                                {vehicle.invoices &&
                                vehicle.invoices.length > 0 ? (
                                  <Link
                                    href={`/dashboard/invoices/${vehicle.invoices[0].id}`}
                                    className="text-primary hover:underline"
                                  >
                                    {vehicle.invoices[0].invoiceNumber}
                                  </Link>
                                ) : vehicle.customer ? (
                                  <Link
                                    href={`/dashboard/invoices/new?vehicleId=${vehicle.id}&customerId=${vehicle.customer.id}`}
                                    className="text-primary hover:underline text-sm"
                                  >
                                    Create Invoice
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground text-sm">
                                    N/A
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <Link
                                  href={`/dashboard/vehicles/${vehicle.id}`}
                                  className="text-primary hover:underline"
                                >
                                  View
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Documents Dialog */}
      <Dialog open={documentsDialogOpen} onOpenChange={setDocumentsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vehicle Documents</DialogTitle>
            <DialogDescription>
              Download documents for this vehicle
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {selectedVehicleDocuments.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No documents available
              </p>
            ) : (
              selectedVehicleDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{doc.name}</p>
                    {doc.category && (
                      <p className="text-sm text-muted-foreground">
                        Category: {doc.category}
                      </p>
                    )}
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {doc.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.fileUrl, "_blank")}
                    >
                      <span className="material-symbols-outlined text-sm mr-1">
                        download
                      </span>
                      Download
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                // Download all documents
                selectedVehicleDocuments.forEach((doc) => {
                  window.open(doc.fileUrl, "_blank");
                });
              }}
              disabled={selectedVehicleDocuments.length === 0}
            >
              <span className="material-symbols-outlined text-sm mr-1">
                download
              </span>
              Download All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
