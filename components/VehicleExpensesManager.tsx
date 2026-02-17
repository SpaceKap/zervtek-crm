"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
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
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { VendorForm } from "./VendorForm";
import { Checkbox } from "./ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";

interface Vendor {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  costType: string;
  amount: number;
  currency: string;
  vendorId: string;
  vendor: { id: string; name: string };
  paymentDeadline: string | null;
  paymentDate: string | null;
  stage: string | null;
  createdAt: string;
  source?: "vehicle" | "invoice";
  invoiceId?: string;
  invoiceNumber?: string;
  costItemId?: string;
}

interface VehicleExpensesManagerProps {
  vehicleId: string;
  onUpdate?: () => void;
}

const costCategories = [
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

export function VehicleExpensesManager({
  vehicleId,
  onUpdate,
}: VehicleExpensesManagerProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    currency: "JPY",
    vendorId: "",
    paymentDeadline: "",
    paymentDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vehicles/${vehicleId}/costs`);
      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

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

  useEffect(() => {
    fetchExpenses();
    fetchVendors();
  }, [fetchExpenses, fetchVendors]);

  const formatAmount = (value: string | number) => {
    const numValue =
      typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
    if (isNaN(numValue)) return "";
    return numValue.toLocaleString("en-US");
  };

  const parseAmount = (value: string) => {
    return value.replace(/,/g, "");
  };

  const handleOpenDialog = (expense?: Expense) => {
    if (expense?.source === "invoice") return; // Invoice costs are read-only here
    setError(null);
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        category: expense.costType,
        amount: formatAmount(expense.amount),
        currency: expense.currency,
        vendorId: expense.vendorId,
        paymentDeadline: expense.paymentDeadline
          ? (() => {
              const d = new Date(expense.paymentDeadline!);
              return isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
            })()
          : "",
        paymentDate: expense.paymentDate
          ? (() => {
              const d = new Date(expense.paymentDate!);
              return isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
            })()
          : "",
      });
    } else {
      setEditingExpense(null);
      setFormData({
        category: "",
        amount: "",
        currency: "JPY",
        vendorId: "",
        paymentDeadline: "",
        paymentDate: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSaveExpense = async () => {
    setError(null);

    if (!formData.category || !formData.vendorId || !formData.amount) {
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
      const expenseData = {
        costType: formData.category,
        amount: parseAmount(formData.amount),
        currency: formData.currency,
        vendorId: formData.vendorId,
        paymentDeadline: formData.paymentDeadline || null,
        paymentDate: formData.paymentDate || null,
        stage: null, // We don't restrict by stage anymore
      };

      let response;
      if (editingExpense) {
        response = await fetch(
          `/api/vehicles/${vehicleId}/costs/${editingExpense.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(expenseData),
          },
        );
      } else {
        response = await fetch(`/api/vehicles/${vehicleId}/costs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(expenseData),
        });
      }

      if (response.ok) {
        await fetchExpenses();
        if (onUpdate) onUpdate();
        setDialogOpen(false);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to save expense");
      }
    } catch (error) {
      console.error("Error saving expense:", error);
      setError("Failed to save expense. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (expenseId: string, isPaid: boolean) => {
    try {
      const expense = expenses.find((e) => e.id === expenseId);
      if (!expense) return;

      const response = await fetch(
        `/api/vehicles/${vehicleId}/costs/${expenseId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentDate: isPaid ? new Date().toISOString().split("T")[0] : null,
          }),
        },
      );

      if (response.ok) {
        await fetchExpenses();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert("Failed to update payment status");
    }
  };

  const handleDeleteExpense = async (expenseId: string, expense?: Expense) => {
    if (expense?.source === "invoice") return; // Invoice costs are managed in the invoice
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const response = await fetch(
        `/api/vehicles/${vehicleId}/costs/${expenseId}`,
        {
          method: "DELETE",
        },
      );
      if (response.ok) {
        await fetchExpenses();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("Failed to delete expense");
    }
  };

  const totalAmount = expenses.reduce(
    (sum, expense) => sum + parseFloat(expense.amount.toString()),
    0,
  );

  const formatCurrency = (amount: string | number, currency: string) => {
    const cleanAmount =
      typeof amount === "string"
        ? parseFloat(amount.replace(/,/g, ""))
        : amount;
    return `${cleanAmount.toLocaleString("en-US")} ${currency}`;
  };

  const safeFormatDate = (d: string | Date | null | undefined) => {
    if (!d) return "";
    const date = new Date(d);
    return isNaN(date.getTime()) ? "" : format(date, "MMM dd, yyyy");
  };

  const isPaid = (expense: Expense) => !!expense.paymentDate;
  const isOverdue = (expense: Expense) => {
    if (expense.paymentDate) return false;
    if (!expense.paymentDeadline) return false;
    const d = new Date(expense.paymentDeadline);
    return !isNaN(d.getTime()) && d < new Date();
  };

  if (loading) {
    return <div className="text-center py-4">Loading expenses...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Vehicle Expenses</h3>
          <p className="text-sm text-gray-500 dark:text-[#A1A1A1]">
            Total: {formatCurrency(totalAmount, "JPY")}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>Add Expense</Button>
      </div>

      <div className="space-y-2">
        {expenses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No expenses added yet
          </div>
        ) : (
          expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2C] rounded-lg border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{expense.costType}</div>
                  {expense.source === "invoice" && expense.invoiceNumber && (
                    <Badge variant="outline" className="text-xs">
                      {expense.invoiceNumber}
                    </Badge>
                  )}
                  {isPaid(expense) ? (
                    <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700">
                      Paid
                    </Badge>
                  ) : isOverdue(expense) ? (
                    <Badge className="bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700">
                      Overdue
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700">
                      Pending
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-[#A1A1A1] mt-1">
                  {expense.vendor.name} •{" "}
                  {formatCurrency(expense.amount, expense.currency)}
                </div>
                {(expense.paymentDeadline || expense.paymentDate) && (
                  <div className="text-xs text-gray-500 dark:text-[#A1A1A1] mt-1 space-y-0.5">
                    {expense.paymentDeadline && safeFormatDate(expense.paymentDeadline) && (
                      <div>
                        Deadline:{" "}
                        {safeFormatDate(expense.paymentDeadline)}
                      </div>
                    )}
                    {expense.paymentDate && safeFormatDate(expense.paymentDate) && (
                      <div>
                        Paid:{" "}
                        {safeFormatDate(expense.paymentDate)}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {expense.source !== "invoice" && (
                  <>
                    <Checkbox
                      checked={isPaid(expense)}
                      onCheckedChange={(checked) =>
                        handleMarkPaid(expense.id, !!checked)
                      }
                    />
                    <span className="text-xs text-gray-500 dark:text-[#A1A1A1]">
                      Mark paid
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(expense)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteExpense(expense.id, expense)}
                    >
                      Delete
                    </Button>
                  </>
                )}
                {expense.source === "invoice" && expense.invoiceId && (
                  <Link href={`/dashboard/invoices/${expense.invoiceId}/cost`}>
                    <Button size="sm" variant="ghost">
                      Edit in Invoice
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl font-semibold">
              {editingExpense ? "Edit Expense" : "Add Expense"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {editingExpense
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
                value={formData.category || undefined}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger id="category" className="h-11">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {costCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Amount <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                  ¥
                </span>
                <Input
                  id="amount"
                  type="text"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, "");
                    if (value === "") {
                      setFormData((prev) => ({ ...prev, amount: "" }));
                    } else {
                      const formatted = parseInt(value, 10).toLocaleString(
                        "en-US",
                      );
                      setFormData((prev) => ({ ...prev, amount: formatted }));
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
              <Select
                value={formData.vendorId || undefined}
                onValueChange={(value) => {
                  if (value === "__create__") {
                    setVendorDialogOpen(true);
                  } else {
                    setFormData((prev) => ({ ...prev, vendorId: value }));
                  }
                }}
                required
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
                  <SelectItem value="__create__">
                    + Create new vendor
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="paymentDeadline"
                  className="text-sm font-medium"
                >
                  Payment Deadline <span className="text-destructive">*</span>
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
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentDate" className="text-sm font-medium">
                  Payment Date
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
                <p className="text-xs text-muted-foreground mt-1.5">
                  Optional - set when paid
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-2">
                <span className="material-symbols-outlined text-destructive text-sm mt-0.5">
                  error
                </span>
                <p className="text-sm text-destructive flex-1">{error}</p>
              </div>
            )}
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 border-t gap-2">
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
              onClick={handleSaveExpense}
              disabled={
                saving ||
                !formData.category ||
                !formData.vendorId ||
                !formData.amount ||
                !formData.paymentDeadline
              }
              className="h-10 min-w-[100px]"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm animate-spin">
                    sync
                  </span>
                  {editingExpense ? "Updating..." : "Saving..."}
                </span>
              ) : editingExpense ? (
                "Update"
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vendor Form Dialog */}
      {vendorDialogOpen && (
        <VendorForm
          vendor={null}
          onClose={async (createdVendorId?: string) => {
            await fetchVendors();
            setVendorDialogOpen(false);
            if (createdVendorId) {
              setFormData((prev) => ({ ...prev, vendorId: createdVendorId }));
            }
          }}
        />
      )}
    </div>
  );
}
