"use client";

import { useState, useEffect } from "react";
import { ShippingStage } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";
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

interface Vendor {
  id: string;
  name: string;
}

interface QuickChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  stage: ShippingStage;
  chargeType: string;
  vendors: Vendor[];
  preselectedVendorId?: string | null;
  onSuccess?: () => void;
}

export function QuickChargeDialog({
  open,
  onOpenChange,
  vehicleId,
  stage,
  chargeType,
  vendors,
  preselectedVendorId,
  onSuccess,
}: QuickChargeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: "",
    currency: "JPY",
    vendorId: preselectedVendorId || "",
  });

  // Update vendorId when preselectedVendorId changes
  useEffect(() => {
    if (preselectedVendorId) {
      setFormData((prev) => ({ ...prev, vendorId: preselectedVendorId }));
    }
  }, [preselectedVendorId]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        amount: "",
        currency: "JPY",
        vendorId: preselectedVendorId || "",
      });
      setError(null);
    }
  }, [open, preselectedVendorId]);

  const handleSave = async () => {
    setError(null);

    if (!formData.amount || !formData.vendorId) {
      setError("Please fill in all required fields");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/vehicles/${vehicleId}/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage,
          costType: chargeType,
          amount: formData.amount,
          currency: formData.currency,
          vendorId: formData.vendorId,
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create charge");
      }
    } catch (error) {
      console.error("Error creating charge:", error);
      setError("Failed to create charge. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader className="space-y-3 px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold">
            Add {chargeType}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Enter the charge details for this service. All fields marked with *
            are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-2">
          {/* Vendor Selection */}
          <div className="space-y-2">
            <Label htmlFor="vendor" className="text-sm font-medium">
              Vendor <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.vendorId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, vendorId: value }))
              }
              disabled={!!preselectedVendorId}
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
            {preselectedVendorId && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5">
                <span className="material-symbols-outlined text-xs">info</span>
                Using yard vendor (automatically selected)
              </p>
            )}
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="0.00"
                className="h-11"
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
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="h-10 min-w-[120px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm animate-spin">
                  sync
                </span>
                Adding...
              </span>
            ) : (
              "Add Charge"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
