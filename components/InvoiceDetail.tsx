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
import { PublicInvoiceView } from "@/components/PublicInvoiceView";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";
import { cn } from "@/lib/utils";

interface InvoiceDetailProps {
  invoice: any;
  currentUser: any;
  canApprove: boolean;
  canFinalize: boolean;
  canDelete: boolean;
  additionalVehicles?: any[];
  companyInfo?: any;
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
  "Inspections",
  "Insurance",
  "Other",
];

export function InvoiceDetail({
  invoice,
  currentUser,
  canApprove,
  canFinalize,
  canDelete,
  additionalVehicles = [],
  companyInfo,
}: InvoiceDetailProps) {
  const isPwa = useStandalonePwa();
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
            const sharedDate = siv.sharedInvoice?.date;
            const sharedDeadline = siv.sharedInvoice?.paymentDeadline;
            sharedInvoiceCostsMap.set(invoiceNumber, {
              id: `shared-${siv.id}`,
              description: `${typeLabel} Fee (${invoiceNumber})`,
              amount: parseFloat(siv.allocatedAmount.toString()),
              vendorId: null,
              vendor: null,
              paymentDate: sharedDate
                ? typeof sharedDate === "string"
                  ? sharedDate
                  : sharedDate.toISOString()
                : null,
              paymentDeadline: sharedDeadline
                ? typeof sharedDeadline === "string"
                  ? sharedDeadline
                  : sharedDeadline.toISOString()
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
        const payDate = cost.paymentDate;
        const payDeadline = cost.paymentDeadline;
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
          paymentDate: payDate
            ? typeof payDate === "string"
              ? payDate
              : payDate.toISOString()
            : null,
          paymentDeadline: payDeadline
            ? typeof payDeadline === "string"
              ? payDeadline
              : payDeadline.toISOString()
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
  const totalCost = costItems.reduce(
    (sum, item) => sum + parseFloat(item.amount.toString()),
    0,
  );
  const profit = revenue - totalCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
      {/* Sticky Header — stacked on PWA so metadata and actions never overlap */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div
          className={cn(
            "max-w-7xl mx-auto py-4",
            isPwa ? "px-3" : "px-4 sm:px-6 lg:px-8",
          )}
        >
          <div
            className={cn(
              "gap-4",
              isPwa
                ? "flex flex-col items-stretch"
                : "flex items-center justify-between",
            )}
          >
            {/* Left: Invoice Info */}
            <div
              className={cn(
                "flex min-w-0 gap-3",
                isPwa ? "w-full items-start" : "flex-1 items-center gap-4",
              )}
            >
              <Link href="/dashboard/financial-operations" className="shrink-0">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <span className="material-symbols-outlined">arrow_back</span>
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "mb-1 gap-2",
                    isPwa
                      ? "flex flex-col items-start gap-2"
                      : "flex flex-wrap items-center gap-3",
                  )}
                >
                  <h1
                    className={cn(
                      "font-bold text-gray-900 dark:text-white",
                      isPwa
                        ? "text-xl break-words"
                        : "text-2xl truncate",
                    )}
                  >
                    {invoice.invoiceNumber}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2">
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
                </div>
                <p
                  className={cn(
                    "text-sm text-muted-foreground",
                    isPwa && "leading-relaxed break-words",
                  )}
                >
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

            {/* Right: actions — icon toolbar + workflow */}
            <div
              className={cn(
                "flex min-w-0 flex-col gap-3",
                isPwa ? "w-full" : "shrink-0 items-end",
              )}
            >
              {/* Edit, share, PDF, delete — one row, icons only */}
              <div
                className={cn(
                  "flex flex-wrap items-center justify-end gap-1.5",
                  isPwa && "w-full justify-start sm:justify-end",
                )}
              >
                {canEdit && (
                  <Button
                    type="button"
                    onClick={() =>
                      router.push(`/dashboard/invoices/${invoice.id}?edit=true`)
                    }
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    aria-label="Edit invoice"
                    title="Edit invoice"
                  >
                    <span className="material-symbols-outlined text-xl">
                      edit
                    </span>
                  </Button>
                )}
                {(invoice.status === "APPROVED" ||
                  invoice.status === "FINALIZED") && (
                  <>
                    <Button
                      type="button"
                      onClick={() => setShowShareDialog(true)}
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      title="Share invoice link"
                      aria-label="Share invoice link"
                    >
                      <span className="material-symbols-outlined text-xl">
                        share
                      </span>
                    </Button>
                    <Button
                      type="button"
                      onClick={handlePreviewPDF}
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      title="Preview PDF"
                      aria-label="Preview PDF"
                    >
                      <span className="material-symbols-outlined text-xl">
                        picture_as_pdf
                      </span>
                    </Button>
                    <Button
                      type="button"
                      onClick={handleDownloadPDF}
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      title="Download PDF"
                      aria-label="Download PDF"
                    >
                      <span className="material-symbols-outlined text-xl">
                        download
                      </span>
                    </Button>
                  </>
                )}
                {invoice.status !== "APPROVED" &&
                  invoice.status !== "FINALIZED" && (
                    <Button
                      type="button"
                      onClick={handlePreviewPDF}
                      variant="outline"
                      disabled
                      size="icon"
                      className="shrink-0"
                      title="Requires approval"
                      aria-label="PDF preview requires approval"
                    >
                      <span className="material-symbols-outlined text-xl">
                        picture_as_pdf
                      </span>
                    </Button>
                  )}
                {canDelete && (
                  <Button
                    type="button"
                    onClick={handleDelete}
                    variant="destructive"
                    disabled={loading}
                    size="icon"
                    className="shrink-0"
                    aria-label="Delete invoice"
                    title="Delete invoice"
                  >
                    <span className="material-symbols-outlined text-xl">
                      delete
                    </span>
                  </Button>
                )}
              </div>

              {/* Submit for Approval */}
              {canSubmitForApproval(currentUser.role) &&
                invoice.status === "DRAFT" &&
                !invoice.isLocked && (
                  <Button
                    onClick={handleSubmitForApproval}
                    disabled={loading}
                    className={cn(
                      "bg-amber-600 hover:bg-amber-700 text-white",
                      isPwa && "w-full",
                    )}
                  >
                    <span className="material-symbols-outlined mr-2 text-lg">
                      send
                    </span>
                    Submit for Approval
                  </Button>
                )}

              {/* Workflow — Admin */}
              {(canApprove || canFinalize) && (
                <>
                  <Separator
                    orientation={isPwa ? "horizontal" : "horizontal"}
                    className={cn(isPwa ? "w-full" : "w-full max-w-md")}
                  />
                  <div
                    className={cn(
                      "flex flex-wrap items-center gap-2",
                      isPwa && "w-full",
                    )}
                  >
                    {canApprove && invoice.status === "PENDING_APPROVAL" && (
                      <Button
                        onClick={handleApprove}
                        disabled={loading}
                        className={cn(
                          "bg-green-600 hover:bg-green-700 text-white",
                          isPwa && "w-full",
                        )}
                        size="lg"
                      >
                        <span className="material-symbols-outlined mr-2 text-lg">
                          check_circle
                        </span>
                        Approve Invoice
                      </Button>
                    )}
                    {canFinalize && invoice.status === "APPROVED" && (
                      <Button
                        onClick={handleFinalize}
                        disabled={loading}
                        className={cn(
                          "bg-blue-600 hover:bg-blue-700 text-white",
                          isPwa && "w-full",
                        )}
                        size="lg"
                      >
                        <span className="material-symbols-outlined mr-2 text-lg">
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
                        className={cn(isPwa && "w-full")}
                      >
                        <span className="material-symbols-outlined mr-2 text-lg">
                          lock_open
                        </span>
                        Unlock
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
      <div
        className={cn(
          "max-w-7xl mx-auto",
          isPwa ? "px-3 py-4" : "px-4 py-8 sm:px-6 lg:px-8",
        )}
      >
        <div
          className={cn(
            "grid grid-cols-1 lg:grid-cols-10 gap-6",
            isPwa && "gap-4",
          )}
        >
          {/* Left 70% - Invoice document (same as public view) */}
          <div className="lg:col-span-7 min-w-0">
            {companyInfo ? (
              <PublicInvoiceView
                invoice={invoice}
                companyInfo={companyInfo}
                customerLinkHref={
                  invoice.customer
                    ? `/dashboard/customers/${invoice.customer.id}`
                    : undefined
                }
                showPortOfDestinationUnderShipping
                hidePaymentSection
                effectivePortOfDestination={
                  invoice.vehicle?.shippingStage?.pod ??
                  invoice.customer?.portOfDestination ??
                  null
                }
                isPwaLayout={isPwa}
              />
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-muted-foreground">
                    Company info not found. Invoice preview unavailable.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          {/* Right 30% - Payment & Workflow (always visible so sidebar is present) */}
          <div className="lg:col-span-3 space-y-6 min-w-0 w-full">
            {/* Payment Information */}
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
                    {currentUser.role === "ADMIN" && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Wise Payment Link
                        </Label>
                        <div
                          className={cn(
                            "flex gap-2",
                            isPwa && "flex-col",
                          )}
                        >
                          <Input
                            value={wisePaymentLink}
                            onChange={(e) => setWisePaymentLink(e.target.value)}
                            placeholder="https://wise.com/pay/business/..."
                            className="font-mono text-sm min-w-0"
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
                            className={cn(isPwa && "w-full shrink-0")}
                          >
                            {savingWiseLink ? "Saving..." : "Save"}
                          </Button>
                        </div>
                        {isPwa ? (
                          <details className="text-xs text-muted-foreground rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                            <summary className="cursor-pointer font-medium text-foreground">
                              How Wise links work
                            </summary>
                            <p className="mt-2 leading-relaxed">
                              Enter your reusable Wise payment link (e.g.,{" "}
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded break-all">
                                https://wise.com/pay/business/ugoigd
                              </code>
                              ). The invoice amount will be automatically added
                              to the link. Create a reusable link in Wise
                              Business dashboard → Payments → Payment Links.
                            </p>
                          </details>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Enter your reusable Wise payment link (e.g.,{" "}
                            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                              https://wise.com/pay/business/ugoigd
                            </code>
                            ). The invoice amount will be automatically added to
                            the link. You can create a reusable link in Wise
                            Business dashboard → Payments → Payment Links.
                          </p>
                        )}
                      </div>
                    )}
                    {invoice.wisePaymentLink && (
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">
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
                        <div
                          className={cn(
                            "mt-2 flex gap-2",
                            isPwa && "flex-col",
                          )}
                        >
                          <Input
                            value={`${typeof window !== "undefined" ? window.location.origin : ""}/invoice/${invoice.shareToken}`}
                            readOnly
                            className="font-mono text-sm min-w-0"
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
                            className={cn(isPwa && "w-full shrink-0")}
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

            {/* Workflow History */}
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
                {invoice.unlockedBy && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-sm text-amber-600 dark:text-amber-400">
                        lock_open
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Unlocked
                      </p>
                      <p className="text-xs text-muted-foreground">
                        by{" "}
                        {invoice.unlockedBy.name ||
                          invoice.unlockedBy.email}
                        {invoice.unlockedAt && (
                          <>
                            {" "}
                            on{" "}
                            {format(
                              new Date(invoice.unlockedAt),
                              "MMM dd, yyyy",
                            )}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {invoice.revertedToDraftBy && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-sm text-slate-600 dark:text-slate-400">
                        undo
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Reverted to draft
                      </p>
                      <p className="text-xs text-muted-foreground">
                        by{" "}
                        {invoice.revertedToDraftBy.name ||
                          invoice.revertedToDraftBy.email}
                        {invoice.revertedToDraftAt && (
                          <>
                            {" "}
                            on{" "}
                            {format(
                              new Date(invoice.revertedToDraftAt),
                              "MMM dd, yyyy",
                            )}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {invoice.editedBy && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-sm text-violet-600 dark:text-violet-400">
                        edit
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Edited
                      </p>
                      <p className="text-xs text-muted-foreground">
                        by{" "}
                        {invoice.editedBy.name ||
                          invoice.editedBy.email}
                        {invoice.editedAt && (
                          <>
                            {" "}
                            on{" "}
                            {format(
                              new Date(invoice.editedAt),
                              "MMM dd, yyyy",
                            )}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {!invoice.approvedBy &&
                  !invoice.finalizedBy &&
                  !invoice.unlockedBy &&
                  !invoice.revertedToDraftBy &&
                  !invoice.editedBy && (
                  <p className="text-sm text-muted-foreground">
                    No workflow events yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
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
