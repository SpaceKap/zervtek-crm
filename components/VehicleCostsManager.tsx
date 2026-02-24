"use client";

import { useState, useEffect, useCallback } from "react";
import { ShippingStage } from "@prisma/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { DialogDescription } from "./ui/dialog";
import { DatePicker } from "./ui/date-picker";

interface Vendor {
  id: string;
  name: string;
}

interface Cost {
  id: string;
  stage: ShippingStage;
  costType: string;
  amount: string;
  currency: string;
  vendor: Vendor;
  paymentDeadline: string | null;
  paymentDate: string | null;
  createdAt: string;
}

interface VehicleCostsManagerProps {
  vehicleId: string;
  currentStage: ShippingStage;
  onStageUpdate?: () => void;
  /** Bump (e.g. after adding a cost from parent) to refetch the costs list. */
  refreshTrigger?: number;
}

const costTypes = [
  "Auction Fees",
  "Purchase Fees",
  "Transport Fees",
  "Inland Transport",
  "Photo Inspection",
  "Inspection Fees",
  "Repair Fees",
  "Storage Fees",
  "Forwarding Fees",
  "Freight Costs",
];

const purchaseCostTypes = ["Auction Fees", "Purchase Fees"];

export function VehicleCostsManager({
  vehicleId,
  currentStage,
  onStageUpdate,
  refreshTrigger,
}: VehicleCostsManagerProps) {
  const isPurchaseStage = currentStage === ShippingStage.PURCHASE;
  const [costs, setCosts] = useState<Cost[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<Cost | null>(null);
  const [formData, setFormData] = useState({
    stage: currentStage,
    costType: "",
    amount: "",
    currency: "JPY",
    vendorId: "",
    paymentDeadline: "",
    paymentDate: "",
    purchasePaid: false,
    purchasePaymentDeadline: "",
    purchasePaymentDate: "",
  });
  const [stageData, setStageData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Helper function to safely parse dates
  const safeDateToString = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    try {
      let dateObj: Date;
      if (typeof date === "string") {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        // Handle case where date might be an object - try to convert to string first
        dateObj = new Date(String(date));
      }
      // Check if dateObj is valid and has getTime method
      if (
        !dateObj ||
        typeof dateObj.getTime !== "function" ||
        isNaN(dateObj.getTime())
      ) {
        return "";
      }
      return dateObj.toISOString().split("T")[0];
    } catch (error) {
      // Silently return empty string - don't log errors for invalid dates
      return "";
    }
  };

  // Format number with commas
  const formatAmount = (value: string | number) => {
    // Convert to string if it's a number
    let stringValue =
      typeof value === "number" ? value.toString() : String(value || "");

    // Remove all commas first (in case they're already there)
    stringValue = stringValue.replace(/,/g, "");

    // Remove all non-digit characters except decimal point
    let numericValue = stringValue.replace(/[^\d.]/g, "");

    // Handle empty string
    if (!numericValue) return "";

    // Ensure only one decimal point
    const decimalIndex = numericValue.indexOf(".");
    if (decimalIndex !== -1) {
      numericValue =
        numericValue.substring(0, decimalIndex + 1) +
        numericValue.substring(decimalIndex + 1).replace(/\./g, "");
    }

    // Split by decimal point
    const parts = numericValue.split(".");

    // Format the integer part with commas
    if (parts[0]) {
      // Use a simple approach: add commas from right to left every 3 digits
      const integerPart = parts[0];
      let formatted = "";
      let count = 0;
      for (let i = integerPart.length - 1; i >= 0; i--) {
        formatted = integerPart[i] + formatted;
        count++;
        if (count % 3 === 0 && i > 0) {
          formatted = "," + formatted;
        }
      }
      parts[0] = formatted;
    }

    // Join parts back together
    return parts.join(".");
  };

  // Remove commas and parse to number
  const parseAmount = (value: string) => {
    return value.replace(/,/g, "");
  };

  const fetchStageData = useCallback(async () => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/stages`);
      if (response.ok) {
        const data = await response.json();
        setStageData(data.shippingStage);
        if (data.shippingStage) {
          setFormData((prev) => ({
            ...prev,
            purchasePaid: data.shippingStage.purchasePaid || false,
            purchasePaymentDeadline: safeDateToString(
              data.shippingStage.purchasePaymentDeadline,
            ),
            purchasePaymentDate: safeDateToString(
              data.shippingStage.purchasePaymentDate,
            ),
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching stage data:", error);
    }
  }, [vehicleId]);

  const fetchCosts = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/vehicles/${vehicleId}/costs?stage=${currentStage}`,
      );
      if (response.ok) {
        const data = await response.json();
        setCosts(data);
      }
    } catch (error) {
      console.error("Error fetching costs:", error);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, currentStage]);

  const fetchVendors = async () => {
    try {
      // Filter vendors by current shipping stage
      const url = `/api/vendors?stage=${currentStage}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  useEffect(() => {
    fetchCosts();
    fetchVendors();
    if (isPurchaseStage) {
      fetchStageData();
    }
  }, [vehicleId, currentStage, isPurchaseStage, refreshTrigger]);
  const handleOpenDialog = (cost?: Cost) => {
    setError(null);
    if (cost) {
      setEditingCost(cost);
      setFormData({
        stage: cost.stage,
        costType: cost.costType,
        amount: formatAmount(cost.amount),
        currency: cost.currency,
        vendorId: cost.vendor.id,
        paymentDeadline: safeDateToString(cost.paymentDeadline),
        paymentDate: safeDateToString(cost.paymentDate),
        purchasePaid: stageData?.purchasePaid || false,
        purchasePaymentDeadline: safeDateToString(
          stageData?.purchasePaymentDeadline,
        ),
        purchasePaymentDate: safeDateToString(stageData?.purchasePaymentDate),
      });
    } else {
      setEditingCost(null);
      setFormData({
        stage: currentStage,
        costType: "",
        amount: "",
        currency: "JPY",
        vendorId: "",
        paymentDeadline: "",
        paymentDate: "",
        purchasePaid: stageData?.purchasePaid || false,
        purchasePaymentDeadline: safeDateToString(
          stageData?.purchasePaymentDeadline,
        ),
        purchasePaymentDate: safeDateToString(stageData?.purchasePaymentDate),
      });
    }
    setDialogOpen(true);
  };

  const handleSaveCost = async () => {
    setError(null);

    // Validation
    if (!formData.costType || !formData.vendorId || !formData.amount) {
      setError("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(parseAmount(formData.amount));
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    try {
      setSaving(true);
      // Save cost
      let costResponse;
      const costData = {
        stage: formData.stage,
        costType: formData.costType,
        amount: parseAmount(formData.amount),
        currency: formData.currency,
        vendorId: formData.vendorId,
        paymentDeadline: formData.paymentDeadline || null,
        paymentDate: formData.paymentDate || null,
      };

      if (editingCost) {
        // Update existing cost
        costResponse = await fetch(
          `/api/vehicles/${vehicleId}/costs/${editingCost.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(costData),
          },
        );
      } else {
        // Create new cost
        costResponse = await fetch(`/api/vehicles/${vehicleId}/costs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(costData),
        });
      }

      if (costResponse?.ok && isPurchaseStage) {
        // Update stage vendor only (payment status removed from UI)
        const stageResponse = await fetch(`/api/vehicles/${vehicleId}/stages`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purchaseVendorId: formData.vendorId,
          }),
        });

        if (stageResponse.ok && onStageUpdate) {
          onStageUpdate();
        }
      }

      if (costResponse?.ok) {
        fetchCosts();
        if (isPurchaseStage) {
          fetchStageData();
        }
        setDialogOpen(false);
        setError(null);
      } else {
        const errorData = await costResponse.json().catch(() => ({}));
        setError(errorData.error || "Failed to save cost");
      }
    } catch (error) {
      console.error("Error saving cost:", error);
      setError("Failed to save cost. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCost = async (costId: string) => {
    if (!confirm("Are you sure you want to delete this cost?")) return;

    try {
      const response = await fetch(
        `/api/vehicles/${vehicleId}/costs/${costId}`,
        {
          method: "DELETE",
        },
      );
      if (response.ok) {
        fetchCosts();
      }
    } catch (error) {
      console.error("Error deleting cost:", error);
      alert("Failed to delete cost");
    }
  };

  const totalAmount = costs.reduce(
    (sum, cost) => sum + parseFloat(cost.amount),
    0,
  );

  const formatCurrency = (amount: string | number, currency: string) => {
    // Remove commas if present, then parse to number
    const cleanAmount =
      typeof amount === "string"
        ? parseFloat(amount.replace(/,/g, ""))
        : amount;
    // Format with commas
    return `${cleanAmount.toLocaleString("en-US")} ${currency}`;
  };

  if (loading) {
    return <div className="text-center py-4">Loading costs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Stage Costs</h3>
          <p className="text-sm text-gray-500 dark:text-[#A1A1A1]">
            Total: {formatCurrency(totalAmount, "JPY")}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>Add Cost</Button>
      </div>

      <div className="space-y-2">
        {costs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No costs added for this stage
          </div>
        ) : (
          costs.map((cost) => (
            <div
              key={cost.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2C] rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium">{cost.costType}</div>
                <div className="text-sm text-gray-600 dark:text-[#A1A1A1]">
                  {cost.vendor.name} •{" "}
                  {formatCurrency(cost.amount, cost.currency)}
                </div>
                {(cost.paymentDeadline || cost.paymentDate) && (
                  <div className="text-xs text-gray-500 dark:text-[#A1A1A1] mt-1 space-y-0.5">
                    {cost.paymentDeadline && (
                      <div>
                        Deadline:{" "}
                        {new Date(cost.paymentDeadline).toLocaleDateString()}
                      </div>
                    )}
                    {cost.paymentDate && (
                      <div>
                        Paid: {new Date(cost.paymentDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDialog(cost)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteCost(cost.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="space-y-3 px-6 pt-6 pb-4">
            <DialogTitle className="text-xl font-semibold">
              {editingCost ? "Edit" : "Add"}{" "}
              {isPurchaseStage ? "Purchase/Auction Fee" : "Cost"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {isPurchaseStage
                ? "Enter purchase or auction fee details. Payment tracking is included."
                : "Enter cost details for this stage. All fields marked with * are required."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-6 py-2">
            {/* Cost Type - Only Auction/Purchase for purchase stage */}
            <div className="space-y-2">
              <Label htmlFor="costType" className="text-sm font-medium">
                Fee Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.costType || undefined}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, costType: value }))
                }
              >
                <SelectTrigger id="costType" className="h-11">
                  <SelectValue placeholder="Select fee type" />
                </SelectTrigger>
                <SelectContent>
                  {(isPurchaseStage ? purchaseCostTypes : costTypes).map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Vendor */}
            <div className="space-y-2">
              <Label htmlFor="vendor" className="text-sm font-medium">
                Vendor <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.vendorId || undefined}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, vendorId: value }))
                }
              >
                <SelectTrigger id="vendor" className="h-11">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount and Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="text"
                  value={formData.amount}
                  onChange={(e) => {
                    const formatted = formatAmount(e.target.value);
                    setFormData((prev) => ({ ...prev, amount: formatted }));
                  }}
                  className="h-11"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-sm font-medium">
                  Currency <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, currency: value }))
                  }
                >
                  <SelectTrigger id="currency" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Payment tracking for all costs (hidden for purchase stage) */}
            {!isPurchaseStage && (
              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Payment Tracking
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="paymentDeadline"
                      className="text-sm font-medium"
                    >
                      Payment Deadline{" "}
                      <span className="text-muted-foreground text-xs">
                        (Optional)
                      </span>
                    </Label>
                    <DatePicker
                      id="paymentDeadline"
                      value={formData.paymentDeadline}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          paymentDeadline: e.target.value,
                        }))
                      }
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="paymentDate"
                      className="text-sm font-medium"
                    >
                      Payment Date{" "}
                      <span className="text-muted-foreground text-xs">
                        (Optional)
                      </span>
                    </Label>
                    <DatePicker
                      id="paymentDate"
                      value={formData.paymentDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          paymentDate: e.target.value,
                        }))
                      }
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
                <span className="material-symbols-outlined text-destructive text-sm mt-0.5">
                  error
                </span>
                <p className="text-sm text-destructive flex-1">{error}</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0 px-6 pb-6 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setError(null);
              }}
              disabled={saving}
              className="h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCost}
              disabled={
                saving ||
                !formData.costType ||
                !formData.vendorId ||
                !formData.amount
              }
              className="h-10 min-w-[120px]"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm animate-spin">
                    sync
                  </span>
                  {editingCost ? "Updating..." : "Adding..."}
                </span>
              ) : (
                `${editingCost ? "Update" : "Add"} Fee`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
