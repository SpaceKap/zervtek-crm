"use client";

import { useState, useEffect, useCallback } from "react";
import { getChargesSubtotal, isChargeSubtracting } from "@/lib/charge-utils";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { VendorForm } from "@/components/VendorForm";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShareInvoiceDialog } from "@/components/ShareInvoiceDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { PaymentStatus } from "@prisma/client";

interface InvoiceDetailProps {
  invoice: any;
  currentUser: any;
  canApprove: boolean;
  canFinalize: boolean;
  canDelete: boolean;
  additionalVehicles?: any[];
}

// Helper to check if user can submit for approval (staff and managers, not admins)
function canSubmitForApproval(userRole: string): boolean {
  return userRole === "SALES" || userRole === "MANAGER";
}

interface Vendor {
  id: string;
  name: string;
}

interface CostItem {
  id: string;
  description: string;
  amount: number;
  vendorId: string | null;
  vendor: { id: string; name: string } | null;
  paymentDate: string | null;
  paymentDeadline: string;
  category: string | null;
}

const defaultCategories = [
  "Auction Fees",
  "Vehicle Purchase",
  "Inland Transport",
  "DHL",
  "Forwarding",
  "Freight",
  "Repair",
  "Storage",
  "Yard Photos",
];

export function InvoiceDetail({
  invoice,
  currentUser,
  canApprove,
  canFinalize,
  canDelete,
  additionalVehicles = [],
}: InvoiceDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>(
    invoice.costInvoice?.costItems || [],
  );
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [editingCharge, setEditingCharge] = useState<any | null>(null);
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [charges, setCharges] = useState(invoice.charges || []);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [wisePaymentLink, setWisePaymentLink] = useState(
    invoice.wisePaymentLink || "",
  );
  const [savingWiseLink, setSavingWiseLink] = useState(false);

  const totalCharges = getChargesSubtotal(charges);

  // Calculate total revenue including tax (discounts/deposits subtract)
  const calculateTotalRevenue = useCallback(
    (chargesArray: any[]) => {
      const chargesTotal = getChargesSubtotal(chargesArray);
      let subtotal = chargesTotal;
      if (invoice.taxEnabled && invoice.taxRate) {
        const taxRate = parseFloat(invoice.taxRate.toString());
        const taxAmount = subtotal * (taxRate / 100);
        subtotal += taxAmount;
      }
      // Always calculate from charges, don't rely on costInvoice.totalRevenue
      // as it might be 0 or outdated
      return subtotal;
    },
    [invoice.taxEnabled, invoice.taxRate],
  );

  const [revenue, setRevenue] = useState(() => calculateTotalRevenue(charges));

  // Update revenue when charges change
  useEffect(() => {
    setRevenue(calculateTotalRevenue(charges));
  }, [charges, calculateTotalRevenue]);

  const canEdit =
    !invoice.isLocked &&
    invoice.status !== "FINALIZED" &&
    (invoice.status === "DRAFT" ||
      invoice.status === "PENDING_APPROVAL" ||
      currentUser.role === "ADMIN");

  const canEditCharges = invoice.status === "DRAFT";

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    setCharges(invoice.charges || []);
  }, [invoice.charges]);

  useEffect(() => {
    // Combine regular cost items with shared invoice costs and vehicle stage costs
    const regularCostItems = invoice.costInvoice?.costItems || [];

    // Get shared invoice costs (forwarder and container costs) for this vehicle
    // Use a Map to deduplicate by shared invoice number
    const sharedInvoiceCostsMap = new Map<string, CostItem>();
    if (invoice.vehicle?.sharedInvoiceVehicles) {
      invoice.vehicle.sharedInvoiceVehicles
        .filter(
          (siv: any) =>
            siv.sharedInvoice?.type === "FORWARDER" ||
            siv.sharedInvoice?.type === "CONTAINER",
        )
        .forEach((siv: any) => {
          const invoiceNumber = siv.sharedInvoice.invoiceNumber;
          const invoiceType = siv.sharedInvoice.type;
          // Only add if we haven't seen this shared invoice number before
          // This prevents duplicates if there are multiple SharedInvoiceVehicle records
          if (!sharedInvoiceCostsMap.has(invoiceNumber)) {
            const typeLabel =
              invoiceType === "CONTAINER" ? "Container" : "Forwarder";
            sharedInvoiceCostsMap.set(invoiceNumber, {
              id: `shared-${siv.id}`,
              description: `${typeLabel} Fee (${invoiceNumber})`,
              amount: parseFloat(siv.allocatedAmount.toString()),
              vendorId: null,
              vendor: null,
              paymentDate: siv.sharedInvoice.date
                ? siv.sharedInvoice.date.toISOString()
                : null,
              paymentDeadline: siv.sharedInvoice.paymentDeadline
                ? siv.sharedInvoice.paymentDeadline.toISOString()
                : "",
              category: invoiceType === "CONTAINER" ? "Shipping" : "Forwarding",
              // Store metadata for shared invoice items
              sharedInvoiceVehicleId: siv.id,
              sharedInvoiceId: siv.sharedInvoiceId,
              vehicleId: siv.vehicleId,
            } as any);
          }
        });
    }

    // Convert Map to array
    const sharedInvoiceCosts = Array.from(sharedInvoiceCostsMap.values());

    // Get vehicle stage costs
    const vehicleStageCosts: CostItem[] = [];
    if (invoice.vehicle?.stageCosts) {
      invoice.vehicle.stageCosts.forEach((cost: any) => {
        vehicleStageCosts.push({
          id: `vehicle-stage-${cost.id}`,
          description: `${cost.costType}${cost.stage ? ` (${cost.stage})` : ""}`,
          amount: parseFloat(cost.amount.toString()),
          vendorId: cost.vendorId,
          vendor: cost.vendor
            ? {
                id: cost.vendor.id,
                name: cost.vendor.name,
              }
            : null,
          paymentDate: cost.paymentDate ? cost.paymentDate.toISOString() : null,
          paymentDeadline: cost.paymentDeadline
            ? cost.paymentDeadline.toISOString()
            : "",
          category: cost.costType,
        });
      });
    }

    setCostItems([
      ...regularCostItems,
      ...sharedInvoiceCosts,
      ...vehicleStageCosts,
    ]);
  }, [
    invoice.costInvoice?.costItems,
    invoice.vehicle?.sharedInvoiceVehicles,
    invoice.vehicle?.stageCosts,
  ]);

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

  const handleSubmitForApproval = async () => {
    if (
      !confirm(
        "Submit this invoice for approval? It will be sent to an admin for review.",
      )
    )
      return;
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/submit`, {
        method: "POST",
      });
      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to submit invoice for approval");
      }
    } catch (error) {
      alert("Failed to submit invoice for approval");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm("Approve this invoice?")) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/approve`, {
        method: "POST",
      });
      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to approve invoice");
      }
    } catch (error) {
      alert("Failed to approve invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!confirm("Finalize this invoice? It will be locked for editing."))
      return;
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/finalize`, {
        method: "POST",
      });
      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to finalize invoice");
      }
    } catch (error) {
      alert("Failed to finalize invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!confirm("Unlock this invoice to allow editing?")) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/unlock`, {
        method: "POST",
      });
      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Failed to unlock invoice: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      alert("Failed to unlock invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`,
      )
    )
      return;
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.push("/dashboard/invoices");
      } else {
        const error = await response.json();
        alert(`Failed to delete invoice: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      alert("Failed to delete invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    window.open(`/api/invoices/${invoice.id}/pdf`, "_blank");
  };

  const handlePreviewPDF = () => {
    window.open(`/api/invoices/${invoice.id}/pdf`, "_blank");
  };

  const statusConfig: Record<
    string,
    { label: string; className: string; icon: string }
  > = {
    DRAFT: {
      label: "Draft",
      className:
        "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600",
      icon: "edit_note",
    },
    PENDING_APPROVAL: {
      label: "Pending Approval",
      className:
        "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700",
      icon: "pending",
    },
    APPROVED: {
      label: "Approved",
      className:
        "bg-green-50 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700",
      icon: "check_circle",
    },
    FINALIZED: {
      label: "Finalized",
      className:
        "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700",
      icon: "lock",
    },
  };

  const statusInfo = statusConfig[invoice.status] || statusConfig.DRAFT;
  const billingAddress = invoice.customer.billingAddress as any;
  const shippingAddress = invoice.customer.shippingAddress as any;
  const totalCost = costItems.reduce(
    (sum, item) => sum + parseFloat(item.amount.toString()),
    0,
  );
  const profit = revenue - totalCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Invoice Info */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Link href="/dashboard/financial-operations">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <span className="material-symbols-outlined">arrow_back</span>
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                    {invoice.invoiceNumber}
                  </h1>
                  <Badge
                    variant="outline"
                    className={`${statusInfo.className} border font-medium px-3 py-1`}
                  >
                    <span className="material-symbols-outlined text-sm mr-1.5">
                      {statusInfo.icon}
                    </span>
                    {statusInfo.label}
                  </Badge>
                  {invoice.isLocked && (
                    <Badge
                      variant="outline"
                      className="bg-red-50 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700"
                    >
                      <span className="material-symbols-outlined text-sm mr-1.5">
                        lock
                      </span>
                      Locked
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Created{" "}
                  {format(
                    new Date(invoice.createdAt),
                    "MMM dd, yyyy 'at' h:mm a",
                  )}
                  {invoice.createdBy &&
                    ` by ${invoice.createdBy.name || invoice.createdBy.email}`}
                </p>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Primary Actions */}
              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button
                    onClick={() =>
                      router.push(`/dashboard/invoices/${invoice.id}?edit=true`)
                    }
                    variant="outline"
                    className="hidden sm:flex"
                  >
                    <span className="material-symbols-outlined text-lg mr-2">
                      edit
                    </span>
                    Edit Invoice
                  </Button>
                )}
                {/* Submit for Approval - Visible to Staff and Managers when Draft */}
                {canSubmitForApproval(currentUser.role) &&
                  invoice.status === "DRAFT" &&
                  !invoice.isLocked && (
                    <Button
                      onClick={handleSubmitForApproval}
                      disabled={loading}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <span className="material-symbols-outlined text-lg mr-2">
                        send
                      </span>
                      Submit for Approval
                    </Button>
                  )}
                {(invoice.status === "APPROVED" ||
                  invoice.status === "FINALIZED") && (
                  <>
                    <Button
                      onClick={() => setShowShareDialog(true)}
                      variant="outline"
                      className="hidden sm:flex"
                      title="Share Invoice Link"
                    >
                      <span className="material-symbols-outlined text-lg mr-2">
                        share
                      </span>
                      Share Link
                    </Button>
                    <Button
                      onClick={handlePreviewPDF}
                      variant="outline"
                      size="icon"
                      className="hidden sm:flex"
                    >
                      <span className="material-symbols-outlined">
                        picture_as_pdf
                      </span>
                    </Button>
                    <Button
                      onClick={handleDownloadPDF}
                      variant="outline"
                      size="icon"
                      className="hidden sm:flex"
                    >
                      <span className="material-symbols-outlined">
                        download
                      </span>
                    </Button>
                  </>
                )}
                {invoice.status !== "APPROVED" &&
                  invoice.status !== "FINALIZED" && (
                    <Button
                      onClick={handlePreviewPDF}
                      variant="outline"
                      disabled
                      size="icon"
                      className="hidden sm:flex"
                      title="Requires Approval"
                    >
                      <span className="material-symbols-outlined">
                        picture_as_pdf
                      </span>
                    </Button>
                  )}
              </div>

              {/* Workflow Actions - Admin Only */}
              {(canApprove || canFinalize) && (
                <>
                  <Separator
                    orientation="vertical"
                    className="h-6 hidden sm:block"
                  />
                  <div className="flex items-center gap-2">
                    {canApprove && invoice.status === "PENDING_APPROVAL" && (
                      <Button
                        onClick={handleApprove}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                      >
                        <span className="material-symbols-outlined text-lg mr-2">
                          check_circle
                        </span>
                        Approve Invoice
                      </Button>
                    )}
                    {canFinalize && invoice.status === "APPROVED" && (
                      <Button
                        onClick={handleFinalize}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="lg"
                      >
                        <span className="material-symbols-outlined text-lg mr-2">
                          lock
                        </span>
                        Finalize Invoice
                      </Button>
                    )}
                    {canFinalize && invoice.isLocked && (
                      <Button
                        onClick={handleUnlock}
                        variant="outline"
                        disabled={loading}
                      >
                        <span className="material-symbols-outlined text-lg mr-2">
                          lock_open
                        </span>
                        Unlock
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        onClick={handleDelete}
                        variant="destructive"
                        disabled={loading}
                        size="icon"
                      >
                        <span className="material-symbols-outlined">
                          delete
                        </span>
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Key Metrics Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Total Revenue
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      ¥{revenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                      attach_money
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Total Cost
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      ¥{totalCost.toLocaleString()}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">
                      receipt
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`border-l-4 ${profit >= 0 ? "border-l-green-500" : "border-l-red-500"}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {profit >= 0 ? "Profit" : "Loss"}
                    </p>
                    <p
                      className={`text-2xl font-bold mt-1 ${profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {profit >= 0 ? "+" : ""}¥
                      {Math.abs(profit).toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`h-12 w-12 rounded-lg flex items-center justify-center ${profit >= 0 ? "bg-green-100 dark:bg-green-900/20" : "bg-red-100 dark:bg-red-900/20"}`}
                  >
                    <span
                      className={`material-symbols-outlined ${profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {profit >= 0 ? "trending_up" : "trending_down"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Margin
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {margin.toFixed(1)}%
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400">
                      percent
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Customer & Vehicle */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl text-muted-foreground">
                      person
                    </span>
                    <CardTitle>Customer Information</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Name
                        </Label>
                        <div className="mt-1">
                          <Link
                            href={`/dashboard/customers/${invoice.customer.id}`}
                            className="text-base font-semibold text-gray-900 dark:text-white hover:text-primary dark:hover:text-[#D4AF37] transition-colors inline-flex items-center gap-1"
                          >
                            {invoice.customer.name}
                            <span className="material-symbols-outlined text-sm">
                              open_in_new
                            </span>
                          </Link>
                        </div>
                      </div>
                      {invoice.customer.email && (
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Email
                          </Label>
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                            {invoice.customer.email}
                          </p>
                        </div>
                      )}
                      {invoice.customer.phone && (
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Phone
                          </Label>
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                            {invoice.customer.phone}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      {billingAddress && (
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Billing Address
                          </Label>
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {[
                              billingAddress.street,
                              billingAddress.city,
                              billingAddress.state,
                              billingAddress.zip,
                              billingAddress.country,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      )}
                      {shippingAddress && (
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Shipping Address
                          </Label>
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {[
                              shippingAddress.street,
                              shippingAddress.city,
                              shippingAddress.state,
                              shippingAddress.zip,
                              shippingAddress.country,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-xl text-muted-foreground">
                        directions_car
                      </span>
                      <CardTitle>
                        {invoice.metadata?.isContainerInvoice
                          ? "Vehicles"
                          : "Vehicle Information"}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Primary Vehicle */}
                    {invoice.vehicle && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              VIN
                            </Label>
                            <p className="mt-1 text-base font-mono font-semibold text-gray-900 dark:text-white">
                              {invoice.vehicle.vin}
                            </p>
                          </div>
                          {(invoice.vehicle.make || invoice.vehicle.model) && (
                            <div>
                              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Make / Model
                              </Label>
                              <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                                {[
                                  invoice.vehicle.year,
                                  invoice.vehicle.make,
                                  invoice.vehicle.model,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                          <Link
                            href={`/dashboard/vehicles/${invoice.vehicle.id}`}
                          >
                            <Button variant="outline" size="sm">
                              <span className="material-symbols-outlined text-base mr-2">
                                directions_car
                              </span>
                              View Vehicle Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Additional Vehicles for Container Invoice */}
                    {invoice.metadata?.isContainerInvoice &&
                      additionalVehicles.length > 0 && (
                        <div className="space-y-3">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Additional Vehicles
                          </Label>
                          {additionalVehicles.map((vehicle, index) => (
                            <div
                              key={vehicle.id}
                              className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 border-l-4 border-l-indigo-500"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    VIN
                                  </Label>
                                  <p className="mt-1 text-sm font-mono font-semibold text-gray-900 dark:text-white">
                                    {vehicle.vin}
                                  </p>
                                </div>
                                {(vehicle.make || vehicle.model) && (
                                  <div>
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                      Make / Model
                                    </Label>
                                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                                      {[
                                        vehicle.year,
                                        vehicle.make,
                                        vehicle.model,
                                      ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Invoice Metadata */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl text-muted-foreground">
                      receipt_long
                    </span>
                    <CardTitle>Invoice Details</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Issue Date
                    </Label>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {format(new Date(invoice.issueDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                  {invoice.dueDate && (
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Due Date
                      </Label>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                        {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                      </p>
                    </div>
                  )}
                  {invoice.taxEnabled && (
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Tax Rate
                      </Label>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                        {parseFloat(invoice.taxRate.toString())}%
                      </p>
                    </div>
                  )}
                  {invoice.notes && (
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Notes
                      </Label>
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {invoice.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Information */}
              {(invoice.status === "APPROVED" ||
                invoice.status === "FINALIZED") && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-xl text-muted-foreground">
                        payments
                      </span>
                      <CardTitle>Payment Information</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Payment Status
                      </Label>
                      <div className="mt-2">
                        <Badge
                          className={
                            invoice.paymentStatus === PaymentStatus.PAID
                              ? "bg-green-100 text-green-800 border-green-200"
                              : invoice.paymentStatus === PaymentStatus.PENDING
                                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                : invoice.paymentStatus ===
                                    PaymentStatus.PARTIALLY_PAID
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : invoice.paymentStatus ===
                                      PaymentStatus.OVERDUE
                                    ? "bg-red-100 text-red-800 border-red-200"
                                    : "bg-gray-100 text-gray-800 border-gray-200"
                          }
                        >
                          {invoice.paymentStatus === PaymentStatus.PAID
                            ? "Paid"
                            : invoice.paymentStatus === PaymentStatus.PENDING
                              ? "Pending"
                              : invoice.paymentStatus ===
                                  PaymentStatus.PARTIALLY_PAID
                                ? "Partially Paid"
                                : invoice.paymentStatus ===
                                    PaymentStatus.OVERDUE
                                  ? "Overdue"
                                  : invoice.paymentStatus || "Pending"}
                        </Badge>
                      </div>
                      {invoice.paidAt && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Paid on{" "}
                          {format(
                            new Date(invoice.paidAt),
                            "MMM dd, yyyy 'at' h:mm a",
                          )}
                        </p>
                      )}
                    </div>
                    {currentUser.role === "ADMIN" && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Wise Payment Link
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={wisePaymentLink}
                            onChange={(e) => setWisePaymentLink(e.target.value)}
                            placeholder="https://wise.com/pay/business/..."
                            className="font-mono text-sm"
                          />
                          <Button
                            onClick={async () => {
                              setSavingWiseLink(true);
                              try {
                                const response = await fetch(
                                  `/api/invoices/${invoice.id}`,
                                  {
                                    method: "PATCH",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      wisePaymentLink: wisePaymentLink || null,
                                    }),
                                  },
                                );
                                if (response.ok) {
                                  router.refresh();
                                  alert("Wise payment link saved");
                                } else {
                                  alert("Failed to save Wise payment link");
                                }
                              } catch (error) {
                                alert("Failed to save Wise payment link");
                              } finally {
                                setSavingWiseLink(false);
                              }
                            }}
                            disabled={savingWiseLink}
                            size="sm"
                          >
                            {savingWiseLink ? "Saving..." : "Save"}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Enter your reusable Wise payment link (e.g.,{" "}
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                            https://wise.com/pay/business/ugoigd
                          </code>
                          ). The invoice amount will be automatically added to
                          the link. You can create a reusable link in Wise
                          Business dashboard → Payments → Payment Links.
                        </p>
                      </div>
                    )}
                    {invoice.wisePaymentLink && (
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Payment Link
                        </Label>
                        <a
                          href={invoice.wisePaymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <span>View Payment Link</span>
                          <span className="material-symbols-outlined text-sm">
                            open_in_new
                          </span>
                        </a>
                      </div>
                    )}
                    {invoice.shareToken && (
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Public Invoice Link
                        </Label>
                        <div className="mt-2 flex gap-2">
                          <Input
                            value={`${typeof window !== "undefined" ? window.location.origin : ""}/invoice/${invoice.shareToken}`}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            onClick={async () => {
                              const url = `${window.location.origin}/invoice/${invoice.shareToken}`;
                              try {
                                await navigator.clipboard.writeText(url);
                                alert("Link copied to clipboard!");
                              } catch (error) {
                                alert("Failed to copy link");
                              }
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <span className="material-symbols-outlined text-sm">
                              content_copy
                            </span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Workflow Status */}
              {(invoice.approvedBy || invoice.finalizedBy) && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-xl text-muted-foreground">
                        history
                      </span>
                      <CardTitle>Workflow History</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {invoice.approvedBy && (
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-sm text-green-600 dark:text-green-400">
                            check_circle
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Approved
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by{" "}
                            {invoice.approvedBy.name ||
                              invoice.approvedBy.email}
                          </p>
                        </div>
                      </div>
                    )}
                    {invoice.finalizedBy && (
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-sm text-blue-600 dark:text-blue-400">
                            lock
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Finalized
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by{" "}
                            {invoice.finalizedBy.name ||
                              invoice.finalizedBy.email}
                            {invoice.finalizedAt && (
                              <>
                                {" "}
                                on{" "}
                                {format(
                                  new Date(invoice.finalizedAt),
                                  "MMM dd, yyyy",
                                )}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Charges Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl text-muted-foreground">
                    list
                  </span>
                  <CardTitle>Charges</CardTitle>
                </div>
                {canEditCharges && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingCharge(null);
                      setShowChargeForm(true);
                    }}
                  >
                    <span className="material-symbols-outlined text-sm mr-1">
                      add
                    </span>
                    Add Item
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {charges.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="material-symbols-outlined text-4xl text-muted-foreground mb-3 block">
                    receipt_long
                  </span>
                  <p className="text-sm text-muted-foreground">
                    No charges yet. Click &quot;Edit Invoice&quot; to add
                    charges.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Description
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-32">
                          Amount
                        </th>
                        {canEditCharges && <th className="w-20"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {charges.map((charge: any) => (
                        <tr
                          key={charge.id}
                          className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {charge.description}
                            </p>
                            {charge.chargeType && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {charge.chargeType.name}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right align-top w-32">
                            <p className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                              {isChargeSubtracting(charge)
                                ? `-¥${parseFloat(charge.amount.toString()).toLocaleString()}`
                                : `¥${parseFloat(charge.amount.toString()).toLocaleString()}`
                              }
                            </p>
                          </td>
                          {canEditCharges && (
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingCharge(charge);
                                    setShowChargeForm(true);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    edit
                                  </span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={async () => {
                                    if (!confirm("Delete this charge?")) return;
                                    try {
                                      const response = await fetch(
                                        `/api/invoices/${invoice.id}/charges/${charge.id}`,
                                        { method: "DELETE" },
                                      );
                                      if (response.ok) {
                                        setCharges(
                                          charges.filter(
                                            (c: any) => c.id !== charge.id,
                                          ),
                                        );
                                        router.refresh();
                                      } else {
                                        const error = await response.json();
                                        alert(
                                          error.error ||
                                            "Failed to delete charge",
                                        );
                                      }
                                    } catch (error) {
                                      alert("Failed to delete charge");
                                    }
                                  }}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    delete
                                  </span>
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 dark:border-gray-700">
                        <td className="py-4 px-4">
                          <p className="text-base font-bold text-gray-900 dark:text-white">
                            Total
                          </p>
                        </td>
                        <td className="py-4 px-4 text-right w-32">
                          <p className="text-base font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            ¥{totalCharges.toLocaleString()}
                          </p>
                        </td>
                        {canEditCharges && <td></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost Breakdown Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl text-muted-foreground">
                    account_balance_wallet
                  </span>
                  <CardTitle>Cost Breakdown</CardTitle>
                </div>
                {canEdit && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingItem(null);
                      setShowItemForm(true);
                    }}
                  >
                    <span className="material-symbols-outlined text-sm mr-1">
                      add
                    </span>
                    Add Cost
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {costItems.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="material-symbols-outlined text-4xl text-muted-foreground mb-3 block">
                    receipt_long
                  </span>
                  <p className="text-sm text-muted-foreground">
                    No cost items yet. Click &quot;Add Cost&quot; to add one.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Description
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Vendor
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Payment Deadline & Date
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-32">
                          Amount
                        </th>
                        {canEdit && <th className="w-20"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {costItems.map((item) => {
                        const isSharedInvoice = item.id.startsWith("shared-");
                        const isVehicleStageCost =
                          item.id.startsWith("vehicle-stage-");
                        const isReadOnly =
                          isSharedInvoice || isVehicleStageCost;
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {item.description}
                                </p>
                                {item.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.category}
                                  </Badge>
                                )}
                                {isSharedInvoice && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700"
                                  >
                                    Shared
                                  </Badge>
                                )}
                                {isVehicleStageCost && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-green-50 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700"
                                  >
                                    Vehicle Cost
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {item.vendor?.name || (
                                  <span className="text-muted-foreground italic">
                                    N/A
                                  </span>
                                )}
                              </p>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col gap-1">
                                  {item.paymentDeadline &&
                                    !isNaN(
                                      new Date(
                                        item.paymentDeadline,
                                      ).getTime(),
                                    ) && (
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                      <span className="font-medium">
                                        Deadline:
                                      </span>{" "}
                                      {format(
                                        new Date(item.paymentDeadline),
                                        "MMM dd, yyyy",
                                      )}
                                    </div>
                                  )}
                                  {item.paymentDate &&
                                    !isNaN(
                                      new Date(item.paymentDate).getTime(),
                                    ) ? (
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                      <span className="font-medium">Paid:</span>{" "}
                                      {format(
                                        new Date(item.paymentDate),
                                        "MMM dd, yyyy",
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-muted-foreground italic">
                                      Not paid
                                    </div>
                                  )}
                                </div>
                                {canEdit && !isReadOnly && (
                                  <Checkbox
                                    checked={!!item.paymentDate}
                                    onCheckedChange={async (checked) => {
                                      try {
                                        const response = await fetch(
                                          `/api/invoices/${invoice.id}/cost/items/${item.id}`,
                                          {
                                            method: "PATCH",
                                            headers: {
                                              "Content-Type":
                                                "application/json",
                                            },
                                            body: JSON.stringify({
                                              paymentDate: checked
                                                ? new Date()
                                                    .toISOString()
                                                    .split("T")[0]
                                                : null,
                                            }),
                                          },
                                        );
                                        if (response.ok) {
                                          router.refresh();
                                        } else {
                                          alert(
                                            "Failed to update payment status",
                                          );
                                        }
                                      } catch (error) {
                                        alert(
                                          "Failed to update payment status",
                                        );
                                      }
                                    }}
                                  />
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right align-top w-32">
                              <p className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                ¥
                                {parseFloat(
                                  item.amount.toString(),
                                ).toLocaleString()}
                              </p>
                            </td>
                            {canEdit && (
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      if (isReadOnly) {
                                        if (isSharedInvoice) {
                                          alert(
                                            "To edit shared invoice costs, please edit the shared invoice directly.",
                                          );
                                        } else if (isVehicleStageCost) {
                                          alert(
                                            "To edit vehicle stage costs, please go to the vehicle page and edit them there.",
                                          );
                                        }
                                      } else {
                                        setEditingItem(item);
                                        setShowItemForm(true);
                                      }
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      edit
                                    </span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={async () => {
                                      if (isReadOnly) {
                                        if (isSharedInvoice) {
                                          if (
                                            !confirm(
                                              "Remove this vehicle from the shared invoice? This will remove the cost allocation.",
                                            )
                                          )
                                            return;
                                          try {
                                            const sharedInvoiceId = (
                                              item as any
                                            ).sharedInvoiceId;
                                            const vehicleId = (item as any)
                                              .vehicleId;
                                            const response = await fetch(
                                              `/api/shared-invoices/${sharedInvoiceId}/vehicles?vehicleId=${vehicleId}`,
                                              { method: "DELETE" },
                                            );
                                            if (response.ok) {
                                              router.refresh();
                                            } else {
                                              const error =
                                                await response.json();
                                              alert(
                                                error.error ||
                                                  "Failed to remove vehicle from shared invoice",
                                              );
                                            }
                                          } catch (error) {
                                            alert(
                                              "Failed to remove vehicle from shared invoice",
                                            );
                                          }
                                        } else if (isVehicleStageCost) {
                                          alert(
                                            "To delete vehicle stage costs, please go to the vehicle page and delete them there.",
                                          );
                                        }
                                        return;
                                      }
                                      if (!confirm("Delete this cost item?"))
                                        return;
                                      try {
                                        const response = await fetch(
                                          `/api/invoices/${invoice.id}/cost/items/${item.id}`,
                                          { method: "DELETE" },
                                        );
                                        if (response.ok) {
                                          setCostItems(
                                            costItems.filter(
                                              (i) => i.id !== item.id,
                                            ),
                                          );
                                          router.refresh();
                                        } else {
                                          alert("Failed to delete cost item");
                                        }
                                      } catch (error) {
                                        alert(
                                          isSharedInvoice
                                            ? "Failed to remove vehicle from shared invoice"
                                            : "Failed to delete cost item",
                                        );
                                      }
                                    }}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      delete
                                    </span>
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                        <td colSpan={canEdit ? 4 : 3} className="py-4 px-4">
                          <p className="text-base font-bold text-gray-900 dark:text-white">
                            Total Cost
                          </p>
                        </td>
                        <td className="py-4 px-4 text-right w-32">
                          <p className="text-base font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            ¥{totalCost.toLocaleString()}
                          </p>
                        </td>
                        {canEdit && <td className="py-4 px-4"></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          {costItems.length > 0 && (
            <Card className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 border-2">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center md:text-left">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Revenue
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      ¥{revenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Cost
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      ¥{totalCost.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center md:text-left border-l-0 md:border-l border-gray-300 dark:border-gray-700 pl-0 md:pl-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {profit >= 0 ? "Profit" : "Loss"}
                    </p>
                    <p
                      className={`text-3xl font-bold ${profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {profit >= 0 ? "+" : ""}¥
                      {Math.abs(profit).toLocaleString()}
                    </p>
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Margin</p>
                        <p className="text-lg font-semibold">
                          {margin.toFixed(1)}%
                        </p>
                      </div>
                      <Separator orientation="vertical" className="h-6" />
                      <div>
                        <p className="text-xs text-muted-foreground">ROI</p>
                        <p className="text-lg font-semibold">
                          {roi.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cost Item Form Modal */}
      {showItemForm && (
        <CostItemForm
          item={editingItem}
          vendors={vendors}
          onShowVendorForm={() => setShowVendorForm(true)}
          onSave={async (itemData) => {
            try {
              const url = editingItem
                ? `/api/invoices/${invoice.id}/cost/items/${editingItem.id}`
                : `/api/invoices/${invoice.id}/cost/items`;
              const method = editingItem ? "PATCH" : "POST";

              const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(itemData),
              });

              if (response.ok) {
                const saved = await response.json();
                if (editingItem) {
                  setCostItems(
                    costItems.map((item) =>
                      item.id === editingItem.id ? saved : item,
                    ),
                  );
                } else {
                  setCostItems([...costItems, saved]);
                }
                setShowItemForm(false);
                setEditingItem(null);
                router.refresh();
              } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
              }
            } catch (error) {
              alert("Failed to save cost item");
            }
          }}
          onClose={() => {
            setShowItemForm(false);
            setEditingItem(null);
          }}
        />
      )}
      {showVendorForm && (
        <VendorForm
          vendor={null}
          onClose={async (createdVendorId?: string) => {
            // Refresh vendors list first
            await fetchVendors();
            setShowVendorForm(false);
          }}
        />
      )}
      {showChargeForm && (
        <ChargeForm
          charge={editingCharge}
          onSave={async (chargeData) => {
            try {
              const url = editingCharge
                ? `/api/invoices/${invoice.id}/charges/${editingCharge.id}`
                : `/api/invoices/${invoice.id}/charges`;
              const method = editingCharge ? "PATCH" : "POST";

              const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(chargeData),
              });

              if (response.ok) {
                const saved = await response.json();
                if (editingCharge) {
                  setCharges(
                    charges.map((c: any) =>
                      c.id === editingCharge.id ? saved : c,
                    ),
                  );
                } else {
                  setCharges([...charges, saved]);
                }
                setShowChargeForm(false);
                setEditingCharge(null);
                router.refresh();
              } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
              }
            } catch (error) {
              alert("Failed to save charge");
            }
          }}
          onClose={() => {
            setShowChargeForm(false);
            setEditingCharge(null);
          }}
        />
      )}
      <ShareInvoiceDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        invoiceId={invoice.id}
      />
    </div>
  );
}

function ChargeForm({
  charge,
  onSave,
  onClose,
}: {
  charge: any | null;
  onSave: (data: {
    description: string;
    amount: number;
    chargeTypeId?: string;
  }) => void;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(charge?.description || "");
  const [amount, setAmount] = useState(
    charge?.amount
      ? parseInt(charge.amount.toString(), 10).toLocaleString("en-US")
      : "",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert("Description is required");
      return;
    }
    if (!amount) {
      alert("Amount is required");
      return;
    }
    onSave({
      description: description.trim(),
      amount: parseFloat(amount.replace(/,/g, "")) || 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{charge ? "Edit Item" : "Add Item"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Description *</Label>
              <Input
                type="text"
                placeholder="e.g., Vehicle Price, Shipping Fee"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <Label>Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                  ¥
                </span>
                <Input
                  type="text"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, "");
                    if (value === "") {
                      setAmount("");
                    } else {
                      const formatted = parseInt(value, 10).toLocaleString(
                        "en-US",
                      );
                      setAmount(formatted);
                    }
                  }}
                  className="pl-8"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function CostItemForm({
  item,
  vendors,
  onSave,
  onClose,
  onShowVendorForm,
}: {
  item: CostItem | null;
  vendors: Vendor[];
  onSave: (data: {
    description: string;
    amount: number;
    vendorId?: string;
    paymentDate?: string;
    paymentDeadline?: string;
    category?: string;
  }) => void;
  onClose: () => void;
  onShowVendorForm: () => void;
}) {
  const [amount, setAmount] = useState(
    item?.amount
      ? parseInt(item.amount.toString(), 10).toLocaleString("en-US")
      : "",
  );
  const [vendorId, setVendorId] = useState(item?.vendorId || "");
  const safeFormatDate = (val: string | null | undefined): string => {
    if (!val) return "";
    const d = new Date(val);
    return !isNaN(d.getTime()) ? format(d, "yyyy-MM-dd") : "";
  };
  const [paymentDate, setPaymentDate] = useState(() =>
    safeFormatDate(item?.paymentDate ?? undefined),
  );
  const [paymentDeadline, setPaymentDeadline] = useState(
    () =>
      safeFormatDate(item?.paymentDeadline) ||
      new Date().toISOString().split("T")[0],
  );
  const [category, setCategory] = useState(
    item?.category || item?.description || "",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      alert("Amount is required");
      return;
    }
    if (!vendorId || vendorId === "__none__") {
      alert("Vendor is required");
      return;
    }
    if (!paymentDeadline) {
      alert("Payment deadline is required");
      return;
    }
    onSave({
      description: category && category !== "__custom__" ? category : "",
      amount: parseFloat(amount.replace(/,/g, "")) || 0,
      vendorId: vendorId,
      paymentDate: paymentDate || undefined,
      paymentDeadline: paymentDeadline,
      category: category && category !== "__custom__" ? category : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{item ? "Edit Cost Item" : "Add Cost Item"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select
                value={category || undefined}
                onValueChange={(value) =>
                  setCategory(value === "__custom__" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {defaultCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                  ¥
                </span>
                <Input
                  type="text"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, "");
                    if (value === "") {
                      setAmount("");
                    } else {
                      const formatted = parseInt(value, 10).toLocaleString(
                        "en-US",
                      );
                      setAmount(formatted);
                    }
                  }}
                  className="pl-8"
                  required
                />
              </div>
            </div>
            <div>
              <Label>Vendor *</Label>
              <Select
                key={`vendor-select-${vendors.length}-${vendorId}`}
                value={vendorId || "__none__"}
                onValueChange={(value) => {
                  if (value === "__create__") {
                    onShowVendorForm();
                  } else {
                    setVendorId(value === "__none__" ? "" : value);
                  }
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__create__">
                    + Create new vendor
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment Deadline *</Label>
                <DatePicker
                  value={paymentDeadline}
                  onChange={(e) => setPaymentDeadline(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Payment Date</Label>
                <DatePicker
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional - set when paid
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
