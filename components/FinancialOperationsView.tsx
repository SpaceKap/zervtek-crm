"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddTransactionDialog } from "./AddTransactionDialog";
import {
  SharedInvoicesList,
  SharedInvoicesListRef,
} from "./SharedInvoicesList";
import { InvoicesList } from "./InvoicesList";
import { CustomersList } from "./CustomersList";
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
import { DatePicker } from "@/components/ui/date-picker";
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
import { ShippingStage, DocumentCategory } from "@prisma/client";
import { format } from "date-fns";

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
  currency?: string;
  date: string;
  description: string | null;
  vendor: { id: string; name: string } | null;
  customer: { id: string; name: string; email: string | null } | null;
  vehicle: {
    id: string;
    vin: string;
    make: string | null;
    model: string | null;
    year: number | null;
  } | null;
  invoiceUrl: string | null;
  referenceNumber: string | null;
  notes: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  paymentDeadline?: string | null;
  paymentDate?: string | null;
  isGeneralCost?: boolean;
  isVehicleStageCost?: boolean;
  isInvoice?: boolean;
  costType?: string | null;
  category?: string | null;
  paymentStatus?: string | null; // due, overdue, partially_paid, paid
  invoiceStatus?: string | null;
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
  currency?: string;
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

  const getInitialSection = (): "transactions" | "vehicles" | "customers" | "invoices" => {
    if (sectionParam === "vehicles") {
      return "vehicles";
    }
    if (sectionParam === "customers") {
      return "customers";
    }
    if (sectionParam === "invoices") {
      return "invoices";
    }
    return "transactions";
  };

  const [activeSection, setActiveSection] = useState<
    "transactions" | "vehicles" | "customers" | "invoices"
  >(getInitialSection());

  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionTab, setTransactionTab] =
    useState<TransactionDirection>("INCOMING");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [datePreset, setDatePreset] = useState<string>("custom");
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(
    null,
  );
  const [amountReceived, setAmountReceived] = useState("");
  const [markingPayment, setMarkingPayment] = useState(false);

  // Fetch customers and vendors for filters
  const [customers, setCustomers] = useState<
    Array<{ id: string; name: string; email: string | null }>
  >([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>(
    [],
  );

  useEffect(() => {
    if (activeSection === "transactions") {
      // Fetch customers
      fetch("/api/customers")
        .then((res) => res.json())
        .then((data) => setCustomers(Array.isArray(data) ? data : []))
        .catch((err) => console.error("Error fetching customers:", err));

      // Fetch vendors
      fetch("/api/vendors")
        .then((res) => res.json())
        .then((data) => setVendors(Array.isArray(data) ? data : []))
        .catch((err) => console.error("Error fetching vendors:", err));
    }
  }, [activeSection]);

  // Invoice management state
  const [invoiceTab, setInvoiceTab] = useState<"customer" | "shared">(
    "customer",
  );
  const sharedInvoicesListRef = useRef<SharedInvoicesListRef>(null);

  const canViewSharedInvoices =
    currentUser.role === UserRole.SALES ||
    currentUser.role === UserRole.MANAGER ||
    currentUser.role === UserRole.ADMIN;

  // Vehicles state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [vehicleFilterType, setVehicleFilterType] = useState<"all" | "mine">(
    "all",
  );
  const [vehicleCustomerFilter, setVehicleCustomerFilter] =
    useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("purchaseDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [selectedVehicleDocuments, setSelectedVehicleDocuments] = useState<
    any[]
  >([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentSearchQuery, setDocumentSearchQuery] = useState("");
  const [documentCategoryFilter, setDocumentCategoryFilter] =
    useState<string>("all");
  const [documentStageFilter, setDocumentStageFilter] = useState<string>("all");

  // Fetch customers for filter
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch("/api/customers");
        if (response.ok) {
          const data = await response.json();
          setCustomers(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    };
    if (activeSection === "vehicles") {
      fetchCustomers();
    }
  }, [activeSection]);

  // General costs state
  const [costs, setCosts] = useState<GeneralCost[]>([]);
  // Note: vendors state is shared with transactions section above
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
  const fetchTransactions = useCallback(async () => {
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
  }, [transactionTab, typeFilter, startDate, endDate]);

  useEffect(() => {
    if (activeSection === "transactions") {
      fetchTransactions();
    }
  }, [activeSection, fetchTransactions]);

  // Reset filters when switching tabs
  useEffect(() => {
    setSearchQuery("");
    setCustomerFilter("all");
    setVendorFilter("all");
    setPaymentStatusFilter("all");
    setDatePreset("custom");
  }, [transactionTab]);

  const fetchVehicles = useCallback(async () => {
    try {
      setVehiclesLoading(true);
      const params = new URLSearchParams();
      if (vehicleSearch) params.append("search", vehicleSearch);
      if (stageFilter !== "all") params.append("stage", stageFilter);
      if (vehicleCustomerFilter !== "all")
        params.append("customerId", vehicleCustomerFilter);
      if (
        vehicleFilterType &&
        (currentUser.role === UserRole.MANAGER ||
          currentUser.role === UserRole.ADMIN ||
          currentUser.role === UserRole.BACK_OFFICE_STAFF)
      ) {
        params.append("filterType", vehicleFilterType);
      }

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
          } else if (sortBy === "eta") {
            aValue = a.shippingStage?.eta
              ? new Date(a.shippingStage.eta).getTime()
              : 0;
            bValue = b.shippingStage?.eta
              ? new Date(b.shippingStage.eta).getTime()
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
  }, [
    vehicleSearch,
    stageFilter,
    vehicleFilterType,
    vehicleCustomerFilter,
    sortBy,
    sortOrder,
    currentUser.role,
  ]);

  const handleViewDocuments = async (vehicleId: string) => {
    try {
      setDocumentsLoading(true);
      setDocumentSearchQuery("");
      setDocumentCategoryFilter("all");
      setDocumentStageFilter("all");
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
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Filter documents
  const filteredDocuments = selectedVehicleDocuments.filter((doc) => {
    if (documentSearchQuery) {
      const query = documentSearchQuery.toLowerCase();
      if (
        !doc.name?.toLowerCase().includes(query) &&
        !doc.description?.toLowerCase().includes(query) &&
        !doc.category?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (
      documentCategoryFilter !== "all" &&
      doc.category !== documentCategoryFilter
    ) {
      return false;
    }
    if (documentStageFilter !== "all" && doc.stage !== documentStageFilter) {
      return false;
    }
    return true;
  });

  // Group documents by category
  const groupedDocuments = filteredDocuments.reduce(
    (acc, doc) => {
      const key = doc.category || "Other";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(doc);
      return acc;
    },
    {} as Record<string, typeof selectedVehicleDocuments>,
  );

  // Get unique categories and stages
  const documentCategories = Array.from(
    new Set(selectedVehicleDocuments.map((d) => d.category).filter(Boolean)),
  );
  const documentStages = Array.from(
    new Set(selectedVehicleDocuments.map((d) => d.stage).filter(Boolean)),
  );

  // Format file size
  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format category name from enum to readable format
  const formatCategoryName = (category: string | null | undefined) => {
    if (!category) return "Other";
    // Convert EXPORT_CERTIFICATE to Export Certificate
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Get file type icon
  const getFileIcon = (
    fileType: string | null | undefined,
    fileUrl: string,
  ) => {
    if (!fileType) {
      const ext = fileUrl.split(".").pop()?.toLowerCase();
      if (["pdf"].includes(ext || "")) return "picture_as_pdf";
      if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || ""))
        return "image";
      if (["doc", "docx"].includes(ext || "")) return "description";
      if (["xls", "xlsx"].includes(ext || "")) return "table_chart";
      return "insert_drive_file";
    }
    if (fileType.includes("pdf")) return "picture_as_pdf";
    if (fileType.includes("image")) return "image";
    if (fileType.includes("word") || fileType.includes("document"))
      return "description";
    if (fileType.includes("excel") || fileType.includes("spreadsheet"))
      return "table_chart";
    return "insert_drive_file";
  };

  // Download all as zip (opens all in new tabs for now, could be improved with backend zip)
  const handleDownloadAll = () => {
    filteredDocuments.forEach((doc, index) => {
      setTimeout(() => {
        window.open(doc.fileUrl, "_blank");
      }, index * 200); // Stagger downloads to avoid browser blocking
    });
  };

  // Fetch vehicles when section becomes active or filters change
  useEffect(() => {
    if (activeSection === "vehicles") {
      fetchVehicles();
    }
  }, [activeSection, fetchVehicles]);

  // Note: General costs are no longer a separate section

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
        currency: cost.currency || "JPY",
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

  const typeColors: Record<TransactionType, string> = {
    BANK_TRANSFER:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    PAYPAL: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    CASH: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    WISE: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
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

  // Calculate summary statistics (exclude invoices - they're shown in Invoices tab only)
  const incomingTransactions = transactions.filter(
    (t) => t.direction === "INCOMING" && !t.isInvoice,
  );
  const outgoingTransactions = transactions.filter(
    (t) => t.direction === "OUTGOING",
  );

  const incomingTotal = incomingTransactions.reduce(
    (sum, t) => sum + parseFloat(t.amount),
    0,
  );

  const outgoingTotal = outgoingTransactions.reduce(
    (sum, t) => sum + parseFloat(t.amount),
    0,
  );

  const netAmount = incomingTotal - outgoingTotal;

  const isOverdue = (t: Transaction) => {
    if (t.isInvoice && t.paymentStatus === "overdue") return true;
    if (!t.paymentDate && t.paymentDeadline) {
      const deadline = new Date(t.paymentDeadline);
      return deadline < new Date();
    }
    return false;
  };

  const overdueCount = transactions.filter(
    (t) => !t.isInvoice && isOverdue(t),
  ).length;

  const paidCount = transactions.filter((t) => {
    if (t.isInvoice) return false;
    return !!t.paymentDate;
  }).length;

  const pendingCount = transactions.filter((t) => {
    if (t.isInvoice) return false;
    return !t.paymentDate;
  }).length;

  const transactionTotal = transactions.reduce(
    (sum, t) => sum + parseFloat(t.amount),
    0,
  );

  const costTotal = costs.reduce((sum, c) => sum + parseFloat(c.amount), 0);

  // Apply date presets
  const applyDatePreset = (preset: string) => {
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    switch (preset) {
      case "today":
        setStartDate(startOfToday.toISOString().split("T")[0]);
        setEndDate(startOfToday.toISOString().split("T")[0]);
        break;
      case "thisWeek":
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
        setStartDate(startOfWeek.toISOString().split("T")[0]);
        setEndDate(today.toISOString().split("T")[0]);
        break;
      case "thisMonth":
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(startOfMonth.toISOString().split("T")[0]);
        setEndDate(today.toISOString().split("T")[0]);
        break;
      case "lastMonth":
        const lastMonthStart = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1,
        );
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(lastMonthStart.toISOString().split("T")[0]);
        setEndDate(lastMonthEnd.toISOString().split("T")[0]);
        break;
      case "thisYear":
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        setStartDate(startOfYear.toISOString().split("T")[0]);
        setEndDate(today.toISOString().split("T")[0]);
        break;
      case "all":
        setStartDate("");
        setEndDate("");
        break;
      default:
        break;
    }
    setDatePreset(preset);
  };

  // Filter and sort transactions
  const filteredAndSortedTransactions = transactions
    .filter((t) => {
      // Exclude invoices - they're shown in the Invoices tab only
      if (t.isInvoice) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          t.description?.toLowerCase().includes(query) ||
          t.invoiceNumber?.toLowerCase().includes(query) ||
          t.customer?.name?.toLowerCase().includes(query) ||
          t.customer?.email?.toLowerCase().includes(query) ||
          t.vendor?.name?.toLowerCase().includes(query) ||
          t.vehicle?.vin?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Customer filter (for incoming)
      if (transactionTab === "INCOMING" && customerFilter !== "all") {
        if (t.customer?.id !== customerFilter) return false;
      }

      // Vendor filter (for outgoing)
      if (transactionTab === "OUTGOING" && vendorFilter !== "all") {
        if (t.vendor?.id !== vendorFilter) return false;
      }

      // Payment status filter
      if (paymentStatusFilter !== "all") {
        if (paymentStatusFilter === "paid") {
          if (t.isInvoice && t.paymentStatus !== "paid") return false;
          if (!t.isInvoice && !t.paymentDate) return false;
        } else if (paymentStatusFilter === "pending") {
          if (t.isInvoice && t.paymentStatus === "paid") return false;
          if (!t.isInvoice && t.paymentDate) return false;
        } else if (paymentStatusFilter === "overdue") {
          if (t.isInvoice && t.paymentStatus !== "overdue") return false;
          if (!t.isInvoice) {
            if (t.paymentDate) return false;
            if (!t.paymentDeadline) return false;
            if (new Date(t.paymentDeadline) >= new Date()) return false;
          }
        }
      }

      return true;
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "date":
          aValue = a.date ? new Date(a.date).getTime() : 0;
          bValue = b.date ? new Date(b.date).getTime() : 0;
          break;
        case "amount":
          aValue = parseFloat(a.amount);
          bValue = parseFloat(b.amount);
          break;
        case "customer":
          aValue = a.customer?.name || a.customer?.email || "";
          bValue = b.customer?.name || b.customer?.email || "";
          break;
        case "vendor":
          aValue = a.vendor?.name || "";
          bValue = b.vendor?.name || "";
          break;
        default:
          return 0;
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

  const canViewVehicles =
    currentUser.role === UserRole.MANAGER ||
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.BACK_OFFICE_STAFF ||
    currentUser.role === UserRole.ACCOUNTANT;

  const canViewCustomers =
    currentUser.role === UserRole.SALES ||
    currentUser.role === UserRole.MANAGER ||
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.BACK_OFFICE_STAFF ||
    currentUser.role === UserRole.ACCOUNTANT;

  const canViewInvoices =
    currentUser.role === UserRole.SALES ||
    currentUser.role === UserRole.MANAGER ||
    currentUser.role === UserRole.ADMIN ||
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
              Manage transactions, invoices, and vehicles in one place
            </p>
          </div>
        </div>
      </div>

      <Tabs
        value={activeSection}
        defaultValue={activeSection}
        onValueChange={(v) => setActiveSection(v as typeof activeSection)}
        className="w-full"
      >
        <TabsList
          className="h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground flex flex-wrap gap-1 mb-6"
        >
          {canViewTransactions && (
            <TabsTrigger value="transactions" className="flex-1 min-w-[120px]">
              Transactions
            </TabsTrigger>
          )}
          {canViewInvoices && (
            <TabsTrigger value="invoices" className="flex-1 min-w-[100px]">
              Invoices
            </TabsTrigger>
          )}
          {canViewCustomers && (
            <TabsTrigger value="customers" className="flex-1 min-w-[100px]">
              Customers
            </TabsTrigger>
          )}
          {canViewVehicles && (
            <TabsTrigger value="vehicles" className="flex-1 min-w-[100px]">
              Vehicles
            </TabsTrigger>
          )}
        </TabsList>

        {canViewTransactions && (
          <TabsContent value="transactions" className="mt-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <CardTitle>Transactions</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      onClick={() => setTransactionDialogOpen(true)}
                      variant="outline"
                      className="inline-flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined">add</span>
                      Add Transaction
                    </Button>
                    {canViewInvoices && (
                      <Button
                        variant="outline"
                        onClick={() => setActiveSection("invoices")}
                        className="inline-flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined">receipt</span>
                        View Invoices
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 border-b">
                    <button
                      onClick={() => setTransactionTab("INCOMING")}
                      className={`px-6 py-3 font-medium transition-colors relative ${
                        transactionTab === "INCOMING"
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Incoming Payments
                      {transactionTab === "INCOMING" && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                      )}
                    </button>
                    <button
                      onClick={() => setTransactionTab("OUTGOING")}
                      className={`px-6 py-3 font-medium transition-colors relative ${
                        transactionTab === "OUTGOING"
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Expenses
                      {transactionTab === "OUTGOING" && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                      )}
                    </button>
                  </div>
              </CardHeader>
              <CardContent className="pt-6">
                <>
                    {/* Enhanced Filters */}
                    <div className="space-y-4 mb-6">
                      {/* Search and Quick Filters Row */}
                      <div className="flex gap-4 flex-wrap items-end">
                        <div className="flex-1 min-w-[250px]">
                          <Label
                            htmlFor="search"
                            className="text-xs mb-1.5 block"
                          >
                            Search
                          </Label>
                          <Input
                            id="search"
                            type="text"
                            placeholder="Search by description, invoice #, customer, vendor..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="min-w-[180px]">
                          <Label
                            htmlFor="date-preset"
                            className="text-xs mb-1.5 block"
                          >
                            Quick Date Range
                          </Label>
                          <Select
                            value={datePreset}
                            onValueChange={applyDatePreset}
                          >
                            <SelectTrigger id="date-preset" className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="custom">
                                Custom Range
                              </SelectItem>
                              <SelectItem value="today">Today</SelectItem>
                              <SelectItem value="thisWeek">
                                This Week
                              </SelectItem>
                              <SelectItem value="thisMonth">
                                This Month
                              </SelectItem>
                              <SelectItem value="lastMonth">
                                Last Month
                              </SelectItem>
                              <SelectItem value="thisYear">
                                This Year
                              </SelectItem>
                              <SelectItem value="all">All Time</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {(datePreset === "custom" || datePreset === "all") && (
                          <>
                            <div className="min-w-[150px]">
                              <Label
                                htmlFor="start-date"
                                className="text-xs mb-1.5 block"
                              >
                                Start Date
                              </Label>
                              <DatePicker
                                id="start-date"
                                value={startDate}
                                onChange={(e) => {
                                  setStartDate(e.target.value);
                                  setDatePreset("custom");
                                }}
                                className="w-full"
                              />
                            </div>
                            <div className="min-w-[150px]">
                              <Label
                                htmlFor="end-date"
                                className="text-xs mb-1.5 block"
                              >
                                End Date
                              </Label>
                              <DatePicker
                                id="end-date"
                                value={endDate}
                                onChange={(e) => {
                                  setEndDate(e.target.value);
                                  setDatePreset("custom");
                                }}
                                className="w-full"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Advanced Filters Row */}
                      <div className="flex gap-4 flex-wrap items-end">
                        <div className="min-w-[180px]">
                          <Label
                            htmlFor="type-filter"
                            className="text-xs mb-1.5 block"
                          >
                            Transaction Type
                          </Label>
                          <Select
                            value={typeFilter}
                            onValueChange={setTypeFilter}
                          >
                            <SelectTrigger id="type-filter" className="w-full">
                              <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              {Object.entries(typeLabels).map(
                                ([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {transactionTab === "INCOMING" && (
                          <div className="min-w-[200px]">
                            <Label
                              htmlFor="customer-filter"
                              className="text-xs mb-1.5 block"
                            >
                              Customer
                            </Label>
                            <Select
                              value={customerFilter}
                              onValueChange={setCustomerFilter}
                            >
                              <SelectTrigger
                                id="customer-filter"
                                className="w-full"
                              >
                                <SelectValue placeholder="All Customers" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  All Customers
                                </SelectItem>
                                {customers.map((customer) => (
                                  <SelectItem
                                    key={customer.id}
                                    value={customer.id}
                                  >
                                    {customer.name || customer.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {transactionTab === "OUTGOING" && (
                          <div className="min-w-[200px]">
                            <Label
                              htmlFor="vendor-filter"
                              className="text-xs mb-1.5 block"
                            >
                              Vendor
                            </Label>
                            <Select
                              value={vendorFilter}
                              onValueChange={setVendorFilter}
                            >
                              <SelectTrigger
                                id="vendor-filter"
                                className="w-full"
                              >
                                <SelectValue placeholder="All Vendors" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Vendors</SelectItem>
                                {vendors.map((vendor) => (
                                  <SelectItem key={vendor.id} value={vendor.id}>
                                    {vendor.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="min-w-[180px]">
                          <Label
                            htmlFor="payment-status-filter"
                            className="text-xs mb-1.5 block"
                          >
                            Payment Status
                          </Label>
                          <Select
                            value={paymentStatusFilter}
                            onValueChange={setPaymentStatusFilter}
                          >
                            <SelectTrigger
                              id="payment-status-filter"
                              className="w-full"
                            >
                              <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="overdue">Overdue</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="min-w-[150px]">
                          <Label
                            htmlFor="sort-field"
                            className="text-xs mb-1.5 block"
                          >
                            Sort By
                          </Label>
                          <Select
                            value={sortField}
                            onValueChange={setSortField}
                          >
                            <SelectTrigger id="sort-field" className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="amount">Amount</SelectItem>
                              {transactionTab === "INCOMING" && (
                                <SelectItem value="customer">
                                  Customer
                                </SelectItem>
                              )}
                              {transactionTab === "OUTGOING" && (
                                <SelectItem value="vendor">Vendor</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="min-w-[120px]">
                          <Label
                            htmlFor="sort-direction"
                            className="text-xs mb-1.5 block"
                          >
                            Order
                          </Label>
                          <Select
                            value={sortDirection}
                            onValueChange={(v) =>
                              setSortDirection(v as "asc" | "desc")
                            }
                          >
                            <SelectTrigger
                              id="sort-direction"
                              className="w-full"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="desc">Descending</SelectItem>
                              <SelectItem value="asc">Ascending</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Summary Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-muted/50 rounded-lg border">
                        <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">
                            {transactionTab === "INCOMING"
                              ? "trending_up"
                              : "trending_down"}
                          </span>
                          {transactionTab === "INCOMING"
                            ? "Total Incoming"
                            : "Total Expenses"}
                        </div>
                        <div className="text-2xl font-bold font-mono-numbers">
                          {transactionTab === "INCOMING"
                            ? incomingTotal.toLocaleString()
                            : outgoingTotal.toLocaleString()}{" "}
                          JPY
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 font-mono-numbers">
                          {filteredAndSortedTransactions.length} transaction
                          {filteredAndSortedTransactions.length !== 1
                            ? "s"
                            : ""}
                        </div>
                      </div>

                      {transactionTab === "INCOMING" && (
                        <>
                          <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-green-600 dark:text-green-400">
                                check_circle
                              </span>
                              Paid
                            </div>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-300 font-mono-numbers">
                              {paidCount}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              transactions
                            </div>
                          </div>

                          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-yellow-600 dark:text-yellow-400">
                                schedule
                              </span>
                              Pending
                            </div>
                            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 font-mono-numbers">
                              {pendingCount}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              transactions
                            </div>
                          </div>

                          <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-red-600 dark:text-red-400">
                                warning
                              </span>
                              Overdue
                            </div>
                            <div className="text-2xl font-bold text-red-700 dark:text-red-300 font-mono-numbers">
                              {overdueCount}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              transactions
                            </div>
                          </div>
                        </>
                      )}

                      {transactionTab === "OUTGOING" && (
                        <>
                          <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-green-600 dark:text-green-400">
                                check_circle
                              </span>
                              Paid
                            </div>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-300 font-mono-numbers">
                              {paidCount}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              transactions
                            </div>
                          </div>

                          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-yellow-600 dark:text-yellow-400">
                                schedule
                              </span>
                              Pending
                            </div>
                            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300 font-mono-numbers">
                              {pendingCount}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              transactions
                            </div>
                          </div>

                          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-blue-600 dark:text-blue-400">
                                account_balance
                              </span>
                              Net Amount
                            </div>
                            <div
                              className={`text-2xl font-bold font-mono-numbers ${netAmount >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}
                            >
                              {netAmount >= 0 ? "+" : ""}
                              {netAmount.toLocaleString()} JPY
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Incoming - Outgoing
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {transactionsLoading ? (
                      <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="mt-4 text-muted-foreground">
                          Loading transactions...
                        </p>
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-5xl text-muted-foreground">
                            account_balance
                          </span>
                          <div>
                            <p className="text-lg font-medium text-foreground mb-1">
                              No transactions found
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {transactionTab === "INCOMING"
                                ? "No incoming payments recorded yet"
                                : "No expenses recorded yet"}
                            </p>
                          </div>
                          <Button
                            onClick={() => setTransactionDialogOpen(true)}
                            className="mt-2"
                          >
                            <span className="material-symbols-outlined text-lg mr-2">
                              add
                            </span>
                            Add{" "}
                            {transactionTab === "INCOMING" ? "Payment" : "Cost"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Export Button */}
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Export to CSV
                              const headers =
                                transactionTab === "INCOMING"
                                  ? [
                                      "Date",
                                      "Type",
                                      "Invoice #",
                                      "Customer",
                                      "Vehicle",
                                      "Description",
                                      "Payment Status",
                                      "Actions",
                                      "Amount",
                                    ]
                                  : [
                                      "Date",
                                      "Type",
                                      "Vendor",
                                      "Invoice Attachments",
                                      "Description",
                                      "Payment Dates",
                                      "Payment Status",
                                      "Actions",
                                      "Amount",
                                    ];

                              const csvContent = [
                                headers.join(","),
                                ...filteredAndSortedTransactions.map((t) => {
                                  const formatDate = (
                                    dateString: string | null | undefined,
                                  ) => {
                                    if (!dateString) return "";
                                    const date = new Date(dateString);
                                    if (isNaN(date.getTime())) return "";
                                    return date.toLocaleDateString("en-US");
                                  };

                                  const formatCurrency = (amount: string) => {
                                    return parseFloat(amount).toLocaleString(
                                      "ja-JP",
                                    );
                                  };

                                  const row =
                                    transactionTab === "INCOMING"
                                      ? [
                                          formatDate(t.date),
                                          typeLabels[t.type] || t.type,
                                          t.invoiceNumber || "",
                                          t.customer?.name ||
                                            t.customer?.email ||
                                            "",
                                          t.vehicle
                                            ? `${t.vehicle.year || ""} ${t.vehicle.make || ""} ${t.vehicle.model || ""} - ${t.vehicle.vin}`
                                            : "",
                                          t.description || "",
                                          t.isInvoice
                                            ? t.paymentStatus || "due"
                                            : t.paymentDate
                                              ? "paid"
                                              : "pending",
                                          "", // Actions column (empty in CSV)
                                          formatCurrency(t.amount),
                                        ]
                                      : [
                                          formatDate(t.date),
                                          typeLabels[t.type] || t.type,
                                          t.vendor?.name || "",
                                          t.invoiceId
                                            ? `Invoice ${t.invoiceNumber || t.invoiceId}`
                                            : t.invoiceUrl || "",
                                          t.description || "",
                                          (() => {
                                            const parts: string[] = [];
                                            if (t.paymentDeadline) {
                                              parts.push(
                                                `Due: ${formatDate(t.paymentDeadline)}`,
                                              );
                                            }
                                            if (t.paymentDate) {
                                              parts.push(
                                                `Paid: ${formatDate(t.paymentDate)}`,
                                              );
                                            }
                                            return parts.join(" | ") || "";
                                          })(),
                                          t.isInvoice
                                            ? t.paymentStatus || "due"
                                            : t.paymentDate
                                              ? "paid"
                                              : "pending",
                                          "", // Actions column (empty in CSV)
                                          formatCurrency(t.amount),
                                        ];

                                  return row
                                    .map(
                                      (cell) =>
                                        `"${String(cell).replace(/"/g, '""')}"`,
                                    )
                                    .join(",");
                                }),
                              ].join("\n");

                              const blob = new Blob([csvContent], {
                                type: "text/csv;charset=utf-8;",
                              });
                              const link = document.createElement("a");
                              const url = URL.createObjectURL(blob);
                              link.setAttribute("href", url);
                              link.setAttribute(
                                "download",
                                `${transactionTab.toLowerCase()}-transactions-${new Date().toISOString().split("T")[0]}.csv`,
                              );
                              link.style.visibility = "hidden";
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="inline-flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-sm">
                              download
                            </span>
                            Export CSV
                          </Button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
                                <th
                                  className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                  onClick={() => {
                                    if (sortField === "date") {
                                      setSortDirection(
                                        sortDirection === "asc"
                                          ? "desc"
                                          : "asc",
                                      );
                                    } else {
                                      setSortField("date");
                                      setSortDirection("desc");
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    Date
                                    {sortField === "date" && (
                                      <span className="material-symbols-outlined text-sm">
                                        {sortDirection === "asc"
                                          ? "arrow_upward"
                                          : "arrow_downward"}
                                      </span>
                                    )}
                                  </div>
                                </th>
                                <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                                  Type
                                </th>
                                {transactionTab === "INCOMING" ? (
                                  <>
                                    <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                                      Invoice #
                                    </th>
                                    <th
                                      className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                      onClick={() => {
                                        if (sortField === "customer") {
                                          setSortDirection(
                                            sortDirection === "asc"
                                              ? "desc"
                                              : "asc",
                                          );
                                        } else {
                                          setSortField("customer");
                                          setSortDirection("asc");
                                        }
                                      }}
                                    >
                                      <div className="flex items-center gap-2">
                                        Customer
                                        {sortField === "customer" && (
                                          <span className="material-symbols-outlined text-sm">
                                            {sortDirection === "asc"
                                              ? "arrow_upward"
                                              : "arrow_downward"}
                                          </span>
                                        )}
                                      </div>
                                    </th>
                                    <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                                      Vehicle
                                    </th>
                                  </>
                                ) : (
                                  <>
                                    <th
                                      className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                      onClick={() => {
                                        if (sortField === "vendor") {
                                          setSortDirection(
                                            sortDirection === "asc"
                                              ? "desc"
                                              : "asc",
                                          );
                                        } else {
                                          setSortField("vendor");
                                          setSortDirection("asc");
                                        }
                                      }}
                                    >
                                      <div className="flex items-center gap-2">
                                        Vendor
                                        {sortField === "vendor" && (
                                          <span className="material-symbols-outlined text-sm">
                                            {sortDirection === "asc"
                                              ? "arrow_upward"
                                              : "arrow_downward"}
                                          </span>
                                        )}
                                      </div>
                                    </th>
                                    <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                                      Invoice Attachments
                                    </th>
                                  </>
                                )}
                                <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                                  Description
                                </th>
                                {transactionTab === "OUTGOING" ? (
                                  <>
                                    <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                                      Payment Dates
                                    </th>
                                    <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                                      Payment Status
                                    </th>
                                    <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                                      Actions
                                    </th>
                                  </>
                                ) : (
                                  <>
                                    <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                                      Payment Status
                                    </th>
                                    <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                                      Actions
                                    </th>
                                  </>
                                )}
                                <th
                                  className="text-right text-sm font-semibold text-gray-900 dark:text-white p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                  onClick={() => {
                                    if (sortField === "amount") {
                                      setSortDirection(
                                        sortDirection === "asc"
                                          ? "desc"
                                          : "asc",
                                      );
                                    } else {
                                      setSortField("amount");
                                      setSortDirection("desc");
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-end gap-2">
                                    Amount
                                    {sortField === "amount" && (
                                      <span className="material-symbols-outlined text-sm">
                                        {sortDirection === "asc"
                                          ? "arrow_upward"
                                          : "arrow_downward"}
                                      </span>
                                    )}
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredAndSortedTransactions.map(
                                (transaction) => {
                                  const formatDate = (
                                    dateString: string | null | undefined,
                                  ) => {
                                    if (!dateString) return "—";
                                    const date = new Date(dateString);
                                    if (isNaN(date.getTime())) return "—";
                                    return date.toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    });
                                  };

                                  const formatCurrency = (amount: string) => {
                                    return new Intl.NumberFormat("ja-JP", {
                                      style: "currency",
                                      currency: transaction.currency || "JPY",
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 0,
                                    }).format(parseFloat(amount));
                                  };

                                  // Build description with vehicle info if available (only for outgoing)
                                  let descriptionParts: string[] = [];
                                  if (transaction.description) {
                                    descriptionParts.push(
                                      transaction.description,
                                    );
                                  }

                                  // Add vehicle info to description only for outgoing transactions
                                  if (
                                    transactionTab === "OUTGOING" &&
                                    transaction.vehicle
                                  ) {
                                    const vehicleInfo = transaction.vehicle.year
                                      ? `${transaction.vehicle.year} ${transaction.vehicle.make || ""} ${transaction.vehicle.model || ""} - ${transaction.vehicle.vin}`
                                      : `${transaction.vehicle.make || ""} ${transaction.vehicle.model || ""} - ${transaction.vehicle.vin}`;
                                    descriptionParts.push(vehicleInfo.trim());
                                  }

                                  // Add vendor info for outgoing transactions
                                  if (
                                    transactionTab === "OUTGOING" &&
                                    transaction.vendor
                                  ) {
                                    descriptionParts.push(
                                      `Vendor: ${transaction.vendor.name}`,
                                    );
                                  }

                                  // Add category if available
                                  if (transaction.category) {
                                    descriptionParts.push(
                                      `Category: ${transaction.category}`,
                                    );
                                  }

                                  const fullDescription =
                                    descriptionParts.join("\n");

                                  // Format vehicle display
                                  const vehicleDisplay = transaction.vehicle
                                    ? transaction.vehicle.year
                                      ? `${transaction.vehicle.year} ${transaction.vehicle.make || ""} ${transaction.vehicle.model || ""} - ${transaction.vehicle.vin}`
                                      : `${transaction.vehicle.make || ""} ${transaction.vehicle.model || ""} - ${transaction.vehicle.vin}`
                                    : "—";

                                  return (
                                    <tr
                                      key={transaction.id}
                                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                    >
                                      <td className="p-3 text-sm text-gray-900 dark:text-white">
                                        {formatDate(transaction.date)}
                                      </td>
                                      <td className="p-3">
                                        <span
                                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeColors[transaction.type]}`}
                                        >
                                          {transactionTab === "INCOMING" ? (
                                            <>
                                              <span className="material-symbols-outlined text-sm mr-1">
                                                payments
                                              </span>
                                              {typeLabels[transaction.type]}
                                            </>
                                          ) : (
                                            <>
                                              <span className="material-symbols-outlined text-sm mr-1">
                                                receipt
                                              </span>
                                              {typeLabels[transaction.type]}
                                            </>
                                          )}
                                        </span>
                                      </td>
                                      {transactionTab === "INCOMING" ? (
                                        <>
                                          <td className="p-3 text-sm font-mono text-gray-900 dark:text-white">
                                            {transaction.isInvoice ? (
                                              <Link
                                                href={`/dashboard/invoices/${transaction.invoiceId}`}
                                                className="text-primary hover:underline"
                                              >
                                                {transaction.invoiceNumber ||
                                                  "—"}
                                              </Link>
                                            ) : (
                                              transaction.invoiceNumber ||
                                              transaction.invoiceId ||
                                              "—"
                                            )}
                                          </td>
                                          <td className="p-3 text-sm text-gray-900 dark:text-white">
                                            {transaction.customer ? (
                                              <Link
                                                href={`/dashboard/customers/${transaction.customer.id}`}
                                                className="text-primary dark:text-[#D4AF37] hover:underline font-medium"
                                              >
                                                {transaction.customer.name ||
                                                  transaction.customer.email ||
                                                  "N/A"}
                                              </Link>
                                            ) : (
                                              "N/A"
                                            )}
                                          </td>
                                          <td className="p-3 text-sm text-gray-900 dark:text-white">
                                            {vehicleDisplay}
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="p-3 text-sm text-gray-900 dark:text-white">
                                            {transaction.vendor?.name ? (
                                              transaction.vendor.name
                                            ) : transaction.customer ? (
                                              <Link
                                                href={`/dashboard/customers/${transaction.customer.id}`}
                                                className="text-primary dark:text-[#D4AF37] hover:underline font-medium"
                                              >
                                                {transaction.customer.name ||
                                                  transaction.customer.email ||
                                                  "N/A"}
                                              </Link>
                                            ) : (
                                              "N/A"
                                            )}
                                          </td>
                                          <td className="p-3 text-sm text-gray-900 dark:text-white">
                                            <div className="flex flex-col gap-1">
                                              {transaction.invoiceId && (
                                                <Link
                                                  href={`/dashboard/invoices/${transaction.invoiceId}`}
                                                  className="text-primary hover:underline text-xs"
                                                >
                                                  {transaction.invoiceNumber ||
                                                    "View Invoice"}
                                                </Link>
                                              )}
                                              {transaction.invoiceUrl && (
                                                <div className="flex items-center gap-2">
                                                  <a
                                                    href={
                                                      transaction.invoiceUrl
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline text-xs flex items-center gap-1"
                                                  >
                                                    <span className="material-symbols-outlined text-sm">
                                                      link
                                                    </span>
                                                    View Invoice
                                                  </a>
                                                  <a
                                                    href={
                                                      transaction.invoiceUrl
                                                    }
                                                    download
                                                    className="text-primary hover:underline text-xs flex items-center gap-1"
                                                    title="Download invoice"
                                                  >
                                                    <span className="material-symbols-outlined text-sm">
                                                      download
                                                    </span>
                                                  </a>
                                                </div>
                                              )}
                                              {!transaction.invoiceId &&
                                                !transaction.invoiceUrl && (
                                                  <span className="text-muted-foreground text-xs">
                                                    —
                                                  </span>
                                                )}
                                            </div>
                                          </td>
                                        </>
                                      )}
                                      <td className="p-3 text-sm text-gray-900 dark:text-white">
                                        <div className="flex flex-col whitespace-pre-line">
                                          {fullDescription || "N/A"}
                                          {transaction.isGeneralCost && (
                                            <span className="text-xs text-muted-foreground mt-1">
                                              General Cost
                                            </span>
                                          )}
                                          {transaction.isVehicleStageCost && (
                                            <span className="text-xs text-muted-foreground mt-1">
                                              Vehicle Cost
                                            </span>
                                          )}
                                          {transaction.isInvoice && (
                                            <span className="text-xs text-muted-foreground mt-1">
                                              Invoice
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      {transactionTab === "OUTGOING" ? (
                                        <>
                                          {/* Payment Dates Column */}
                                          <td className="p-3 text-sm text-gray-900 dark:text-white">
                                            {(() => {
                                              // Parse paymentDate from notes if it's stored there (for regular transactions)
                                              let paymentDateFromNotes:
                                                | string
                                                | null = null;
                                              if (
                                                !transaction.paymentDate &&
                                                transaction.notes
                                              ) {
                                                try {
                                                  const notesData = JSON.parse(
                                                    transaction.notes,
                                                  );
                                                  if (notesData.paymentDate) {
                                                    paymentDateFromNotes =
                                                      notesData.paymentDate;
                                                  }
                                                } catch (e) {
                                                  // Notes is not JSON, ignore
                                                }
                                              }

                                              const paymentDate =
                                                transaction.paymentDate ||
                                                paymentDateFromNotes
                                                  ? new Date(
                                                      transaction.paymentDate ||
                                                        paymentDateFromNotes!,
                                                    )
                                                  : null;
                                              const paymentDeadline =
                                                transaction.paymentDeadline
                                                  ? new Date(
                                                      transaction.paymentDeadline,
                                                    )
                                                  : null;

                                              return (
                                                <div className="flex flex-col gap-1.5">
                                                  {paymentDeadline && (
                                                    <div className="flex items-center gap-1.5">
                                                      <span className="text-xs text-muted-foreground font-medium">
                                                        Due:
                                                      </span>
                                                      <span className="text-sm text-gray-900 dark:text-white">
                                                        {formatDate(
                                                          transaction.paymentDeadline,
                                                        )}
                                                      </span>
                                                    </div>
                                                  )}
                                                  {paymentDate && (
                                                    <div className="flex items-center gap-1.5">
                                                      <span className="text-xs text-muted-foreground font-medium">
                                                        Paid:
                                                      </span>
                                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {formatDate(
                                                          transaction.paymentDate ||
                                                            paymentDateFromNotes!,
                                                        )}
                                                      </span>
                                                    </div>
                                                  )}
                                                  {!paymentDeadline &&
                                                    !paymentDate && (
                                                      <span className="text-muted-foreground text-sm">
                                                        —
                                                      </span>
                                                    )}
                                                </div>
                                              );
                                            })()}
                                          </td>
                                          {/* Payment Status Column */}
                                          <td className="p-3">
                                            {(() => {
                                              // For invoices, use the paymentStatus field
                                              if (
                                                transaction.isInvoice &&
                                                transaction.paymentStatus
                                              ) {
                                                const statusColors: Record<
                                                  string,
                                                  string
                                                > = {
                                                  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                                                  partially_paid:
                                                    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                                                  overdue:
                                                    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                                                  due: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                                                };
                                                const statusLabels: Record<
                                                  string,
                                                  string
                                                > = {
                                                  paid: "Paid",
                                                  partially_paid:
                                                    "Partially Paid",
                                                  overdue: "Overdue",
                                                  due: "Due",
                                                };
                                                const status =
                                                  transaction.paymentStatus;
                                                return (
                                                  <span
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.due}`}
                                                  >
                                                    {statusLabels[status] ||
                                                      status}
                                                  </span>
                                                );
                                              }

                                              // Parse paymentDate from notes if it's stored there (for regular transactions)
                                              let paymentDateFromNotes:
                                                | string
                                                | null = null;
                                              if (
                                                !transaction.paymentDate &&
                                                transaction.notes
                                              ) {
                                                try {
                                                  const notesData = JSON.parse(
                                                    transaction.notes,
                                                  );
                                                  if (notesData.paymentDate) {
                                                    paymentDateFromNotes =
                                                      notesData.paymentDate;
                                                  }
                                                } catch (e) {
                                                  // Notes is not JSON, ignore
                                                }
                                              }

                                              const isPaid = !!(
                                                transaction.paymentDate ||
                                                paymentDateFromNotes
                                              );
                                              const paymentDate =
                                                transaction.paymentDate ||
                                                paymentDateFromNotes
                                                  ? new Date(
                                                      transaction.paymentDate ||
                                                        paymentDateFromNotes!,
                                                    )
                                                  : null;
                                              const paymentDeadline =
                                                transaction.paymentDeadline
                                                  ? new Date(
                                                      transaction.paymentDeadline,
                                                    )
                                                  : null;

                                              const isTransactionOverdue =
                                                !paymentDate && paymentDeadline
                                                  ? new Date(paymentDeadline) <
                                                    new Date()
                                                  : false;

                                              return (
                                                <span
                                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    isPaid
                                                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                      : isTransactionOverdue
                                                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                                  }`}
                                                >
                                                  {isPaid ? (
                                                    <>
                                                      <span className="material-symbols-outlined text-xs mr-1">
                                                        check_circle
                                                      </span>
                                                      Paid
                                                    </>
                                                  ) : isTransactionOverdue ? (
                                                    <>
                                                      <span className="material-symbols-outlined text-xs mr-1">
                                                        warning
                                                      </span>
                                                      Overdue
                                                    </>
                                                  ) : (
                                                    <>
                                                      <span className="material-symbols-outlined text-xs mr-1">
                                                        schedule
                                                      </span>
                                                      Pending
                                                    </>
                                                  )}
                                                </span>
                                              );
                                            })()}
                                          </td>
                                          {/* Actions Column */}
                                          <td className="p-3">
                                            {(() => {
                                              // Parse paymentDate from notes if it's stored there (for regular transactions)
                                              let paymentDateFromNotes:
                                                | string
                                                | null = null;
                                              if (
                                                !transaction.paymentDate &&
                                                transaction.notes
                                              ) {
                                                try {
                                                  const notesData = JSON.parse(
                                                    transaction.notes,
                                                  );
                                                  if (notesData.paymentDate) {
                                                    paymentDateFromNotes =
                                                      notesData.paymentDate;
                                                  }
                                                } catch (e) {
                                                  // Notes is not JSON, ignore
                                                }
                                              }

                                              const isPaid = !!(
                                                transaction.paymentDate ||
                                                paymentDateFromNotes
                                              );

                                              const handleMarkAsPaid =
                                                async () => {
                                                  if (
                                                    !confirm(
                                                      "Mark this transaction as paid? This will set the payment date to today.",
                                                    )
                                                  ) {
                                                    return;
                                                  }

                                                  try {
                                                    // If this is a vehicle stage cost, update it via the vehicle stage cost API
                                                    if (
                                                      transaction.isVehicleStageCost &&
                                                      transaction.vehicle?.id
                                                    ) {
                                                      // Extract the cost ID from the transaction ID
                                                      const costId =
                                                        transaction.id.replace(
                                                          "vehicle-cost-",
                                                          "",
                                                        );
                                                      const response =
                                                        await fetch(
                                                          `/api/vehicles/${transaction.vehicle.id}/costs/${costId}`,
                                                          {
                                                            method: "PATCH",
                                                            headers: {
                                                              "Content-Type":
                                                                "application/json",
                                                            },
                                                            body: JSON.stringify(
                                                              {
                                                                paymentDate:
                                                                  new Date().toISOString(),
                                                              },
                                                            ),
                                                          },
                                                        );

                                                      if (response.ok) {
                                                        fetchTransactions();
                                                      } else {
                                                        const errorData =
                                                          await response
                                                            .json()
                                                            .catch(() => ({}));
                                                        alert(
                                                          errorData.error ||
                                                            "Failed to update transaction",
                                                        );
                                                      }
                                                    } else {
                                                      // For regular transactions, store paymentDate in notes as JSON
                                                      let currentNotes: any =
                                                        {};
                                                      try {
                                                        if (transaction.notes) {
                                                          currentNotes =
                                                            JSON.parse(
                                                              transaction.notes,
                                                            );
                                                        }
                                                      } catch (e) {
                                                        // If notes is not JSON, treat it as plain text
                                                        currentNotes = {
                                                          originalNotes:
                                                            transaction.notes,
                                                        };
                                                      }

                                                      const updatedNotes = {
                                                        ...currentNotes,
                                                        paymentDate:
                                                          new Date().toISOString(),
                                                      };

                                                      const response =
                                                        await fetch(
                                                          `/api/transactions/${transaction.id}`,
                                                          {
                                                            method: "PATCH",
                                                            headers: {
                                                              "Content-Type":
                                                                "application/json",
                                                            },
                                                            body: JSON.stringify(
                                                              {
                                                                notes:
                                                                  JSON.stringify(
                                                                    updatedNotes,
                                                                  ),
                                                              },
                                                            ),
                                                          },
                                                        );

                                                      if (response.ok) {
                                                        fetchTransactions();
                                                      } else {
                                                        const errorData =
                                                          await response
                                                            .json()
                                                            .catch(() => ({}));
                                                        alert(
                                                          errorData.error ||
                                                            "Failed to update transaction",
                                                        );
                                                      }
                                                    }
                                                  } catch (error) {
                                                    console.error(
                                                      "Error updating transaction:",
                                                      error,
                                                    );
                                                    alert(
                                                      "Failed to update transaction",
                                                    );
                                                  }
                                                };

                                              const handleEdit = () => {
                                                setEditingTransaction(
                                                  transaction,
                                                );
                                                setTransactionDialogOpen(true);
                                              };

                                              const handleDelete = async () => {
                                                if (
                                                  !confirm(
                                                    "Are you sure you want to delete this transaction? This action cannot be undone.",
                                                  )
                                                ) {
                                                  return;
                                                }

                                                try {
                                                  const response = await fetch(
                                                    `/api/transactions/${transaction.id}`,
                                                    {
                                                      method: "DELETE",
                                                    },
                                                  );

                                                  if (response.ok) {
                                                    fetchTransactions();
                                                  } else {
                                                    const errorData =
                                                      await response
                                                        .json()
                                                        .catch(() => ({}));
                                                    alert(
                                                      errorData.error ||
                                                        "Failed to delete transaction",
                                                    );
                                                  }
                                                } catch (error) {
                                                  console.error(
                                                    "Error deleting transaction:",
                                                    error,
                                                  );
                                                  alert(
                                                    "Failed to delete transaction",
                                                  );
                                                }
                                              };

                                              return (
                                                <div className="flex items-center gap-2">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleEdit}
                                                    className="h-8 px-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                    title="Edit transaction"
                                                  >
                                                    <span className="material-symbols-outlined text-sm">
                                                      edit
                                                    </span>
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleDelete}
                                                    className="h-8 px-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                                                    title="Delete transaction"
                                                  >
                                                    <span className="material-symbols-outlined text-sm">
                                                      delete
                                                    </span>
                                                  </Button>
                                                  {!isPaid && (
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={handleMarkAsPaid}
                                                      className="h-8 px-2 text-xs hover:bg-green-50 dark:hover:bg-green-900/20"
                                                      title="Mark as paid"
                                                    >
                                                      <span className="material-symbols-outlined text-sm">
                                                        check
                                                      </span>
                                                    </Button>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="p-3 text-sm text-gray-900 dark:text-white">
                                            {(() => {
                                              // For invoices, use the paymentStatus field
                                              if (
                                                transaction.isInvoice &&
                                                transaction.paymentStatus
                                              ) {
                                                const statusColors: Record<
                                                  string,
                                                  string
                                                > = {
                                                  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                                                  partially_paid:
                                                    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                                                  overdue:
                                                    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                                                  due: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                                                };
                                                const statusLabels: Record<
                                                  string,
                                                  string
                                                > = {
                                                  paid: "Paid",
                                                  partially_paid:
                                                    "Partially Paid",
                                                  overdue: "Overdue",
                                                  due: "Due",
                                                };
                                                const status =
                                                  transaction.paymentStatus;
                                                return (
                                                  <span
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.due}`}
                                                  >
                                                    {statusLabels[status] ||
                                                      status}
                                                  </span>
                                                );
                                              }

                                              // For incoming payments, show payment status badge only
                                              return (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                  <span className="material-symbols-outlined text-xs mr-1">
                                                    payments
                                                  </span>
                                                  Received
                                                </span>
                                              );
                                            })()}
                                          </td>
                                          {/* Actions Column for Incoming */}
                                          <td className="p-3">
                                            {(() => {
                                              const handleEdit = () => {
                                                setEditingTransaction(
                                                  transaction,
                                                );
                                                setTransactionDialogOpen(true);
                                              };

                                              const handleDelete = async () => {
                                                if (
                                                  !confirm(
                                                    "Are you sure you want to delete this transaction? This action cannot be undone.",
                                                  )
                                                ) {
                                                  return;
                                                }

                                                try {
                                                  const response = await fetch(
                                                    `/api/transactions/${transaction.id}`,
                                                    {
                                                      method: "DELETE",
                                                    },
                                                  );

                                                  if (response.ok) {
                                                    fetchTransactions();
                                                  } else {
                                                    const errorData =
                                                      await response
                                                        .json()
                                                        .catch(() => ({}));
                                                    alert(
                                                      errorData.error ||
                                                        "Failed to delete transaction",
                                                    );
                                                  }
                                                } catch (error) {
                                                  console.error(
                                                    "Error deleting transaction:",
                                                    error,
                                                  );
                                                  alert(
                                                    "Failed to delete transaction",
                                                  );
                                                }
                                              };

                                              const handleMarkPayment = () => {
                                                setSelectedInvoice(transaction);
                                                setAmountReceived(
                                                  transaction.amount,
                                                );
                                                setPaymentDialogOpen(true);
                                              };

                                              const isInvoiceDue =
                                                transaction.isInvoice &&
                                                (transaction.paymentStatus ===
                                                  "due" ||
                                                  transaction.paymentStatus ===
                                                    "overdue");

                                              return (
                                                <div className="flex items-center gap-2">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleEdit}
                                                    className="h-8 px-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                    title="Edit transaction"
                                                  >
                                                    <span className="material-symbols-outlined text-sm">
                                                      edit
                                                    </span>
                                                  </Button>
                                                  {isInvoiceDue && (
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={
                                                        handleMarkPayment
                                                      }
                                                      className="h-8 px-2 text-xs hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400"
                                                      title="Mark payment received"
                                                    >
                                                      <span className="material-symbols-outlined text-sm">
                                                        payments
                                                      </span>
                                                    </Button>
                                                  )}
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleDelete}
                                                    className="h-8 px-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                                                    title="Delete transaction"
                                                  >
                                                    <span className="material-symbols-outlined text-sm">
                                                      delete
                                                    </span>
                                                  </Button>
                                                </div>
                                              );
                                            })()}
                                          </td>
                                        </>
                                      )}
                                      <td className="p-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(transaction.amount)}
                                      </td>
                                    </tr>
                                  );
                                },
                              )}
                            </tbody>
                          </table>
                        </div>

                        {filteredAndSortedTransactions.length === 0 &&
                          transactions.length > 0 && (
                            <div className="text-center py-12">
                              <div className="flex flex-col items-center gap-3">
                                <span className="material-symbols-outlined text-5xl text-muted-foreground">
                                  filter_alt_off
                                </span>
                                <div>
                                  <p className="text-lg font-medium text-foreground mb-1">
                                    No transactions match your filters
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Try adjusting your search or filter criteria
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSearchQuery("");
                                    setCustomerFilter("all");
                                    setVendorFilter("all");
                                    setPaymentStatusFilter("all");
                                    setDatePreset("all");
                                    setStartDate("");
                                    setEndDate("");
                                  }}
                                  className="mt-2"
                                >
                                  Clear All Filters
                                </Button>
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                  </>
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
                setTransactionDialogOpen(false);
              }}
              defaultDirection={transactionTab}
              transaction={editingTransaction}
            />

            {/* Payment Marking Dialog for Invoices */}
            <Dialog
              open={paymentDialogOpen}
              onOpenChange={setPaymentDialogOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mark Payment Received</DialogTitle>
                  <DialogDescription>
                    Enter the amount received for invoice{" "}
                    {selectedInvoice?.invoiceNumber || ""}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-sm font-medium">
                      Invoice Amount:{" "}
                      {selectedInvoice &&
                        new Intl.NumberFormat("ja-JP", {
                          style: "currency",
                          currency: selectedInvoice.currency || "JPY",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(parseFloat(selectedInvoice.amount))}
                    </Label>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      Amount Received *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder="Enter amount received"
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPaymentDialogOpen(false);
                      setSelectedInvoice(null);
                      setAmountReceived("");
                    }}
                    disabled={markingPayment}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!selectedInvoice?.invoiceId || !amountReceived) {
                        alert("Please enter the amount received");
                        return;
                      }

                      try {
                        setMarkingPayment(true);
                        const receivedAmount = parseFloat(amountReceived);
                        const invoiceAmount = parseFloat(
                          selectedInvoice.amount,
                        );

                        const response = await fetch(
                          `/api/invoices/${selectedInvoice.invoiceId}/payment`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              amountReceived: receivedAmount,
                              paidAt: new Date().toISOString(),
                            }),
                          },
                        );

                        if (response.ok) {
                          fetchTransactions();
                          setPaymentDialogOpen(false);
                          setSelectedInvoice(null);
                          setAmountReceived("");
                        } else {
                          const error = await response.json();
                          alert(error.error || "Failed to mark payment");
                        }
                      } catch (error) {
                        console.error("Error marking payment:", error);
                        alert("Failed to mark payment");
                      } finally {
                        setMarkingPayment(false);
                      }
                    }}
                    disabled={markingPayment || !amountReceived}
                  >
                    {markingPayment
                      ? "Processing..."
                      : parseFloat(amountReceived || "0") >=
                          parseFloat(selectedInvoice?.amount || "0")
                        ? "Mark as Paid"
                        : "Mark as Partially Paid"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

        {canViewCustomers && (
          <TabsContent value="customers" className="mt-6">
            <CustomersList />
          </TabsContent>
        )}

        {canViewInvoices && (
          <TabsContent value="invoices" className="mt-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle>Invoices</CardTitle>
                  <div className="flex gap-2">
                    <Link href="/dashboard/invoices/new">
                      <Button className="inline-flex items-center gap-2">
                        <span className="material-symbols-outlined">add</span>
                        New Invoice
                      </Button>
                    </Link>
                    {canViewSharedInvoices && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          sharedInvoicesListRef.current?.openNewForm()
                        }
                        className="inline-flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined">
                          receipt_long
                        </span>
                        New Shared Invoice
                      </Button>
                    )}
                  </div>
                </div>
                <Tabs
                  value={invoiceTab}
                  defaultValue={invoiceTab}
                  onValueChange={(v) =>
                    setInvoiceTab(v as "customer" | "shared")
                  }
                  className="mt-4"
                >
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="customer">
                      Customer Invoices
                    </TabsTrigger>
                    {canViewSharedInvoices && (
                      <TabsTrigger value="shared">
                        Shared Invoices
                      </TabsTrigger>
                    )}
                  </TabsList>
                  <TabsContent value="customer" className="mt-4">
                    <InvoicesList />
                  </TabsContent>
                  {canViewSharedInvoices && (
                    <TabsContent value="shared" className="mt-4">
                      <SharedInvoicesList ref={sharedInvoicesListRef} />
                    </TabsContent>
                  )}
                </Tabs>
              </CardHeader>
            </Card>
          </TabsContent>
        )}

        {canViewVehicles && (
          <TabsContent value="vehicles" className="mt-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Vehicle Database</CardTitle>
                  <Link href="/dashboard/vehicles/new">
                    <Button className="inline-flex items-center gap-2">
                      <span className="material-symbols-outlined">add</span>
                      Add Vehicle
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex gap-4 mb-6 flex-wrap items-end">
                  {(currentUser.role === UserRole.MANAGER ||
                    currentUser.role === UserRole.ADMIN ||
                    currentUser.role === UserRole.BACK_OFFICE_STAFF) && (
                    <div className="flex gap-2">
                      <Button
                        variant={
                          vehicleFilterType === "all" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          setVehicleFilterType("all");
                        }}
                      >
                        All Vehicles
                      </Button>
                      <Button
                        variant={
                          vehicleFilterType === "mine" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          setVehicleFilterType("mine");
                        }}
                      >
                        My Vehicles
                      </Button>
                    </div>
                  )}
                  <div className="flex-1 min-w-[250px]">
                    <Label
                      htmlFor="vehicle-search"
                      className="text-xs mb-1.5 block"
                    >
                      Search
                    </Label>
                    <Input
                      id="vehicle-search"
                      type="text"
                      placeholder="Search by VIN, make, or model..."
                      value={vehicleSearch}
                      onChange={(e) => setVehicleSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && fetchVehicles()}
                      className="w-full"
                    />
                  </div>
                  <div className="min-w-[180px]">
                    <Label
                      htmlFor="customer-filter"
                      className="text-xs mb-1.5 block"
                    >
                      Customer
                    </Label>
                    <Select
                      value={vehicleCustomerFilter}
                      onValueChange={setVehicleCustomerFilter}
                    >
                      <SelectTrigger
                        id="vehicle-customer-filter"
                        className="w-full"
                      >
                        <SelectValue placeholder="All Customers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name || customer.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-[180px]">
                    <Label
                      htmlFor="stage-filter"
                      className="text-xs mb-1.5 block"
                    >
                      Stage
                    </Label>
                    <Select value={stageFilter} onValueChange={setStageFilter}>
                      <SelectTrigger id="stage-filter" className="w-full">
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
                  </div>
                  <div className="min-w-[180px]">
                    <Label htmlFor="sort-by" className="text-xs mb-1.5 block">
                      Sort By
                    </Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger id="sort-by" className="w-full">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchaseDate">
                          Purchase Date
                        </SelectItem>
                        <SelectItem value="eta">ETA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-[140px]">
                    <Label
                      htmlFor="sort-order"
                      className="text-xs mb-1.5 block"
                    >
                      Order
                    </Label>
                    <Select
                      value={sortOrder}
                      onValueChange={(v) => setSortOrder(v as "asc" | "desc")}
                    >
                      <SelectTrigger id="sort-order" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Descending</SelectItem>
                        <SelectItem value="asc">Ascending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={fetchVehicles} className="h-10">
                    <span className="material-symbols-outlined text-sm mr-2">
                      search
                    </span>
                    Search
                  </Button>
                </div>

                {/* Summary Statistics */}
                {!vehiclesLoading && vehicles.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <div className="text-sm text-muted-foreground mb-1">
                        Total Vehicles
                      </div>
                      <div className="text-2xl font-bold">
                        {vehicles.length}
                      </div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <div className="text-sm text-muted-foreground mb-1">
                        By Stage
                      </div>
                      <div className="text-2xl font-bold">
                        {
                          Object.keys(stageLabels).filter((stage) =>
                            vehicles.some(
                              (v) => v.currentShippingStage === stage,
                            ),
                          ).length
                        }
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Active stages
                      </div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <div className="text-sm text-muted-foreground mb-1">
                        Upcoming ETAs
                      </div>
                      <div className="text-2xl font-bold">
                        {
                          vehicles.filter((v) => {
                            if (!v.shippingStage?.eta) return false;
                            const eta = new Date(v.shippingStage.eta);
                            const now = new Date();
                            const daysDiff = Math.ceil(
                              (eta.getTime() - now.getTime()) /
                                (1000 * 60 * 60 * 24),
                            );
                            return daysDiff >= 0 && daysDiff <= 30;
                          }).length
                        }
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Next 30 days
                      </div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <div className="text-sm text-muted-foreground mb-1">
                        Without Invoices
                      </div>
                      <div className="text-2xl font-bold">
                        {
                          vehicles.filter(
                            (v) => !v.invoices || v.invoices.length === 0,
                          ).length
                        }
                      </div>
                    </div>
                  </div>
                )}

                {vehiclesLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="mt-4 text-muted-foreground">
                      Loading vehicles...
                    </p>
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-5xl text-muted-foreground">
                        directions_car
                      </span>
                      <div>
                        <p className="text-lg font-medium text-foreground mb-1">
                          No vehicles found
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {vehicleSearch || stageFilter !== "all"
                            ? "Try adjusting your filters"
                            : "Get started by adding your first vehicle"}
                        </p>
                      </div>
                      {!vehicleSearch && stageFilter === "all" && (
                        <Link href="/dashboard/vehicles/new">
                          <Button className="mt-2">
                            <span className="material-symbols-outlined text-lg mr-2">
                              add
                            </span>
                            Add Vehicle
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold text-sm">
                            VIN
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">
                            Vehicle
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">
                            Customer
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">
                            Stage
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">
                            Purchase Date
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">
                            ETA
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">
                            Yard
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">
                            Documents
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">
                            Costs
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">
                            Invoice
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicles.map((vehicle) => (
                          <tr
                            key={vehicle.id}
                            className="border-b hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 px-4 font-mono text-sm">
                              {vehicle.vin}
                            </td>
                            <td className="py-3 px-4">
                              {vehicle.make} {vehicle.model} {vehicle.year}
                            </td>
                            <td className="py-3 px-4">
                              {vehicle.customer ? (
                                <Link
                                  href={`/dashboard/customers/${vehicle.customer.id}`}
                                  className="text-primary dark:text-[#D4AF37] hover:underline font-medium"
                                >
                                  {vehicle.customer.name || "N/A"}
                                </Link>
                              ) : (
                                "N/A"
                              )}
                            </td>
                            <td className="py-4 px-4">
                              {vehicle.currentShippingStage ? (
                                <span
                                  className={`px-2.5 py-1 rounded-md text-xs font-medium border ${stageColors[vehicle.currentShippingStage as ShippingStage] || ""}`}
                                >
                                  {stageLabels[
                                    vehicle.currentShippingStage as ShippingStage
                                  ] || vehicle.currentShippingStage}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-sm">
                                {vehicle.purchaseDate
                                  ? new Date(
                                      vehicle.purchaseDate,
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-sm">
                                {vehicle.shippingStage?.eta
                                  ? new Date(
                                      vehicle.shippingStage.eta,
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-sm">
                                {vehicle.shippingStage?.yard?.name || "N/A"}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDocuments(vehicle.id)}
                                disabled={vehicle._count.documents === 0}
                              >
                                <span className="material-symbols-outlined text-sm mr-1">
                                  description
                                </span>
                                {vehicle._count.documents}
                              </Button>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-sm font-medium">
                                {vehicle._count.stageCosts}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              {vehicle.invoices &&
                              vehicle.invoices.length > 0 ? (
                                <Link
                                  href={`/dashboard/invoices/${vehicle.invoices[0].id}`}
                                  className="text-sm text-primary hover:underline font-medium"
                                >
                                  {vehicle.invoices[0].invoiceNumber}
                                </Link>
                              ) : vehicle.customer ? (
                                <Link
                                  href={`/dashboard/invoices/new?vehicleId=${vehicle.id}&customerId=${vehicle.customer.id}`}
                                  className="text-sm text-primary hover:underline font-medium"
                                >
                                  Create
                                </Link>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <Link
                                href={`/dashboard/vehicles/${vehicle.id}`}
                                className="text-sm text-primary hover:underline font-medium"
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
          </TabsContent>
        )}
      </Tabs>

      {/* Documents Dialog */}
      <Dialog open={documentsDialogOpen} onOpenChange={setDocumentsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <span className="material-symbols-outlined text-2xl text-primary">
                    folder
                  </span>
                  Vehicle Documents
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {selectedVehicleDocuments.length > 0
                    ? `${selectedVehicleDocuments.length} document${selectedVehicleDocuments.length !== 1 ? "s" : ""} available`
                    : "No documents available"}
                </DialogDescription>
              </div>
              {selectedVehicleDocuments.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAll}
                  disabled={filteredDocuments.length === 0}
                  className="flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">
                    download
                  </span>
                  Download All ({filteredDocuments.length})
                </Button>
              )}
            </div>
          </DialogHeader>

          {documentsLoading ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="ml-3 text-muted-foreground">Loading documents...</p>
            </div>
          ) : selectedVehicleDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <span className="material-symbols-outlined text-6xl text-muted-foreground mb-4">
                folder_off
              </span>
              <p className="text-lg font-medium text-foreground mb-2">
                No documents available
              </p>
              <p className="text-sm text-muted-foreground">
                Documents uploaded for this vehicle will appear here
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6">
              {/* Filters */}
              {selectedVehicleDocuments.length > 3 && (
                <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 pb-4 pt-4 -mx-6 px-6 border-b mb-4">
                  <div className="flex gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <Input
                        placeholder="Search documents..."
                        value={documentSearchQuery}
                        onChange={(e) => setDocumentSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    {documentCategories.length > 0 && (
                      <div className="min-w-[150px]">
                        <Select
                          value={documentCategoryFilter}
                          onValueChange={setDocumentCategoryFilter}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {documentCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {formatCategoryName(cat)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {documentStages.length > 0 && (
                      <div className="min-w-[150px]">
                        <Select
                          value={documentStageFilter}
                          onValueChange={setDocumentStageFilter}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All Stages" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Stages</SelectItem>
                            {documentStages.map((stage) => (
                              <SelectItem key={stage} value={stage}>
                                {stageLabels[stage as ShippingStage] || stage}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {(documentSearchQuery ||
                      documentCategoryFilter !== "all" ||
                      documentStageFilter !== "all") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDocumentSearchQuery("");
                          setDocumentCategoryFilter("all");
                          setDocumentStageFilter("all");
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {filteredDocuments.length !==
                    selectedVehicleDocuments.length && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Showing {filteredDocuments.length} of{" "}
                      {selectedVehicleDocuments.length} documents
                    </p>
                  )}
                </div>
              )}

              {/* Documents List */}
              {filteredDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="material-symbols-outlined text-5xl text-muted-foreground mb-3">
                    search_off
                  </span>
                  <p className="text-lg font-medium text-foreground mb-1">
                    No documents match your filters
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  {Object.keys(groupedDocuments).length > 1
                    ? // Grouped view
                      Object.entries(groupedDocuments).map(
                        ([category, docs]) => {
                          const docsArray =
                            docs as typeof selectedVehicleDocuments;
                          return (
                            <div key={category} className="space-y-2">
                              <h3 className="text-sm font-semibold text-muted-foreground">
                                {formatCategoryName(category)} (
                                {docsArray.length})
                              </h3>
                              {docsArray.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                                >
                                  <div className="flex-shrink-0 mt-1">
                                    <span className="material-symbols-outlined text-3xl text-primary">
                                      {getFileIcon(doc.fileType, doc.fileUrl)}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground truncate">
                                          {doc.name}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                                          {doc.fileSize && (
                                            <span className="flex items-center gap-1">
                                              <span className="material-symbols-outlined text-xs">
                                                data_usage
                                              </span>
                                              {formatFileSize(doc.fileSize)}
                                            </span>
                                          )}
                                          {doc.fileType && (
                                            <span className="flex items-center gap-1">
                                              <span className="material-symbols-outlined text-xs">
                                                description
                                              </span>
                                              {doc.fileType
                                                .split("/")[1]
                                                ?.toUpperCase() || doc.fileType}
                                            </span>
                                          )}
                                          {doc.createdAt && (
                                            <span className="flex items-center gap-1">
                                              <span className="material-symbols-outlined text-xs">
                                                schedule
                                              </span>
                                              {new Date(
                                                doc.createdAt,
                                              ).toLocaleDateString()}
                                            </span>
                                          )}
                                          {doc.stage && (
                                            <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                              {stageLabels[
                                                doc.stage as ShippingStage
                                              ] || doc.stage}
                                            </span>
                                          )}
                                        </div>
                                        {doc.description && (
                                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                            {doc.description}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex gap-2 flex-shrink-0">
                                        {(doc.fileType?.includes("image") ||
                                          doc.fileUrl.match(
                                            /\.(jpg|jpeg|png|gif|webp|pdf)$/i,
                                          )) && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              window.open(doc.fileUrl, "_blank")
                                            }
                                            title="Preview"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <span className="material-symbols-outlined text-sm">
                                              visibility
                                            </span>
                                          </Button>
                                        )}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            window.open(doc.fileUrl, "_blank")
                                          }
                                          className="flex items-center gap-1"
                                        >
                                          <span className="material-symbols-outlined text-sm">
                                            download
                                          </span>
                                          Download
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        },
                      )
                    : // Ungrouped view
                      filteredDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex-shrink-0 mt-1">
                            <span className="material-symbols-outlined text-3xl text-primary">
                              {getFileIcon(doc.fileType, doc.fileUrl)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">
                                  {doc.name}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  {doc.category && (
                                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                      {formatCategoryName(doc.category)}
                                    </span>
                                  )}
                                  {doc.fileSize && (
                                    <span className="flex items-center gap-1">
                                      <span className="material-symbols-outlined text-xs">
                                        data_usage
                                      </span>
                                      {formatFileSize(doc.fileSize)}
                                    </span>
                                  )}
                                  {doc.fileType && (
                                    <span className="flex items-center gap-1">
                                      <span className="material-symbols-outlined text-xs">
                                        description
                                      </span>
                                      {doc.fileType
                                        .split("/")[1]
                                        ?.toUpperCase() || doc.fileType}
                                    </span>
                                  )}
                                  {doc.createdAt && (
                                    <span className="flex items-center gap-1">
                                      <span className="material-symbols-outlined text-xs">
                                        schedule
                                      </span>
                                      {new Date(
                                        doc.createdAt,
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                                  {doc.stage && (
                                    <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                      {stageLabels[
                                        doc.stage as ShippingStage
                                      ] || doc.stage}
                                    </span>
                                  )}
                                </div>
                                {doc.description && (
                                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                    {doc.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                {(doc.fileType?.includes("image") ||
                                  doc.fileUrl.match(
                                    /\.(jpg|jpeg|png|gif|webp|pdf)$/i,
                                  )) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      window.open(doc.fileUrl, "_blank")
                                    }
                                    title="Preview"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      visibility
                                    </span>
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    window.open(doc.fileUrl, "_blank")
                                  }
                                  className="flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    download
                                  </span>
                                  Download
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="px-6 pb-6 pt-4 border-t mt-0">
            <Button
              variant="outline"
              onClick={() => setDocumentsDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
