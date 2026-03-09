"use client";

import { useState, useEffect, useCallback } from "react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { DatePicker } from "./ui/date-picker";
import { format } from "date-fns";

interface Vendor {
  id: string;
  name: string;
}

interface VehicleCostItemRow {
  id: string;
  vehicleId: string;
  description: string;
  amount: number;
  vendorId: string;
  vendor: Vendor;
  paymentDeadline: string | null;
  paymentDate: string | null;
  category: string | null;
  createdAt: string | null;
  updatedAt: string | null;
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

interface VehicleCostBreakdownProps {
  vehicleId: string;
  onUpdate?: () => void;
}

export function VehicleCostBreakdown({
  vehicleId,
  onUpdate,
}: VehicleCostBreakdownProps) {
  const [items, setItems] = useState<VehicleCostItemRow[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VehicleCostItemRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [paymentDeadline, setPaymentDeadline] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [category, setCategory] = useState("");

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/vehicle-cost-items`);
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error fetching vehicle cost items:", e);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch("/api/vendors");
      if (res.ok) {
        const data = await res.json();
        setVendors(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error fetching vendors:", e);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchVendors();
  }, [fetchItems, fetchVendors]);

  const openDialog = (item?: VehicleCostItemRow) => {
    setError(null);
    if (item) {
      setEditingItem(item);
      setCategory(item.category || item.description || "");
      setAmount(formatAmountForInput(Number(item.amount)));
      setVendorId(item.vendorId);
      setPaymentDeadline(
        item.paymentDeadline
          ? format(new Date(item.paymentDeadline), "yyyy-MM-dd")
          : ""
      );
      setPaymentDate(
        item.paymentDate
          ? format(new Date(item.paymentDate), "yyyy-MM-dd")
          : ""
      );
    } else {
      setEditingItem(null);
      setCategory("");
      setAmount("");
      setVendorId("");
      setPaymentDeadline("");
      setPaymentDate("");
    }
    setDialogOpen(true);
  };

  const formatAmountForInput = (value: number) => {
    if (value === 0) return "";
    return value.toLocaleString("en-US");
  };
  const parseAmountInput = (value: string) =>
    parseFloat(value.replace(/,/g, "")) || 0;

  const handleSave = async () => {
    setError(null);
    const amt = parseAmountInput(amount);
    if (!category.trim() || !vendorId || !paymentDeadline) {
      setError("Category, vendor, and payment deadline are required.");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        description: category.trim(),
        amount: amt,
        vendorId,
        paymentDeadline,
        paymentDate: paymentDate || undefined,
        category: category.trim(),
      };

      if (editingItem) {
        const res = await fetch(
          `/api/vehicles/${vehicleId}/vehicle-cost-items/${editingItem.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update");
        }
      } else {
        const res = await fetch(
          `/api/vehicles/${vehicleId}/vehicle-cost-items`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create");
        }
      }
      setDialogOpen(false);
      await fetchItems();
      onUpdate?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: VehicleCostItemRow) => {
    if (!confirm("Delete this cost item?")) return;
    try {
      const res = await fetch(
        `/api/vehicles/${vehicleId}/vehicle-cost-items/${item.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        await fetchItems();
        onUpdate?.();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete");
      }
    } catch (e) {
      alert("Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        Loading cost breakdown...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => openDialog()} className="gap-1.5">
          <span className="material-symbols-outlined text-lg">add</span>
          Add Expense
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-muted-foreground">No cost items.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-2 px-3 font-medium">Description</th>
                <th className="text-left py-2 px-3 font-medium">Vendor</th>
                <th className="text-left py-2 px-3 font-medium">Deadline / Date</th>
                <th className="text-right py-2 px-3 font-medium w-28">Amount</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2 px-3">
                    <span className="font-medium">{item.description}</span>
                    {item.category && (
                      <span className="ml-2 text-muted-foreground text-xs">
                        ({item.category})
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {item.vendor?.name ?? "—"}
                  </td>
                  <td className="py-2 px-3">
                    {item.paymentDeadline
                      ? format(new Date(item.paymentDeadline), "MMM d, yyyy")
                      : "—"}
                    {item.paymentDate && (
                      <span className="text-muted-foreground text-xs block">
                        Paid: {format(new Date(item.paymentDate), "MMM d, yyyy")}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-medium">
                    ¥{Number(item.amount).toLocaleString()}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openDialog(item)}
                      >
                        <span className="material-symbols-outlined text-base">
                          edit
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => handleDelete(item)}
                      >
                        <span className="material-symbols-outlined text-base">
                          delete
                        </span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {editingItem ? "Edit Expense" : "Add Expense"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {editingItem
                ? "Update expense details for this vehicle"
                : "Add a new expense to track costs for this vehicle"}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={category || undefined}
                onValueChange={setCategory}
              >
                <SelectTrigger id="category" className="h-11">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {defaultCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Amount <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                  ¥
                </span>
                <Input
                  id="amount"
                  type="text"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, "");
                    if (value === "") {
                      setAmount("");
                    } else {
                      setAmount(parseInt(value, 10).toLocaleString("en-US"));
                    }
                  }}
                  className="pl-8 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor" className="text-sm font-medium">
                Vendor <span className="text-destructive">*</span>
              </Label>
              <Select value={vendorId || undefined} onValueChange={setVendorId} required>
                <SelectTrigger id="vendor" className="h-11">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentDeadline" className="text-sm font-medium">
                  Payment Deadline <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  id="paymentDeadline"
                  value={paymentDeadline}
                  onChange={(e) => setPaymentDeadline(e.target?.value ?? "")}
                  placeholder="Select date"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentDate" className="text-sm font-medium">
                  Payment Date
                </Label>
                <DatePicker
                  id="paymentDate"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target?.value ?? "")}
                  placeholder="Select date"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Optional - set when paid
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Vendor Invoice (Optional)
              </Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="flex-1 cursor-pointer h-11"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 shrink-0"
                  aria-label="Take photo with camera"
                >
                  <span className="material-symbols-outlined text-lg">camera</span>
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 border-t border-border bg-muted/30 flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !category?.trim() ||
                !vendorId ||
                !paymentDeadline ||
                isNaN(parseAmountInput(amount)) ||
                parseAmountInput(amount) <= 0
              }
              className="h-10 min-w-[100px]"
            >
              {saving
                ? "Saving..."
                : editingItem
                  ? "Update"
                  : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
