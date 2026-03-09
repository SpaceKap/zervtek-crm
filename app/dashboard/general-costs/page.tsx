"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { VendorForm } from "@/components/VendorForm";

interface Vendor {
  id: string;
  name: string;
  email: string | null;
}

interface RecurringCostInstance {
  id: string;
  templateId: string;
  dueDate: string | null;
  amountOverride?: number | null;
  paidAt: string | null;
  invoiceUrl: string | null;
  notes: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface RecurringCostTemplate {
  id: string;
  name: string;
  amount: number;
  currency?: string | null;
  frequency: string;
  type: string;
  firstPaymentDeadline?: string | null;
  vendorId: string;
  vendor?: { id: string; name: string; email: string | null } | null;
  notes?: string | null;
  instances: RecurringCostInstance[];
}

/** Parse amount string (allows "1,000,000" or "1000000") to number */
function parseAmountInput(val: string): number {
  return parseFloat(String(val || "").replace(/,/g, "")) || 0;
}

/** Format number for display in amount input (e.g. 1000000 → "1,000,000") */
function formatAmountForDisplay(val: string | number): string {
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "";
  return num.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

export default function GeneralCostsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [recurringForm, setRecurringForm] = useState({
    name: "",
    amount: "",
    currency: "JPY",
    frequency: "MONTHLY",
    type: "FIXED",
    firstPaymentDeadline: new Date().toISOString().split("T")[0],
    vendorId: "",
    notes: "",
  });
  const [recurringSaving, setRecurringSaving] = useState(false);
  const [recurringError, setRecurringError] = useState<string | null>(null);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [templates, setTemplates] = useState<RecurringCostTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const fetchVendors = async () => {
    try {
      const response = await fetch("/api/vendors?category=OFFICE_EXPENSES");
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const response = await fetch("/api/recurring-cost-templates", {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching recurring templates:", error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchTemplates();
  }, []);

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecurringError(null);
    const amountNum = parseAmountInput(recurringForm.amount);
    if (!recurringForm.name.trim() || isNaN(amountNum) || amountNum < 0) {
      setRecurringError("Description and a valid amount are required.");
      return;
    }
    if (!recurringForm.vendorId) {
      setRecurringError("Vendor is required.");
      return;
    }
    if (!recurringForm.firstPaymentDeadline) {
      setRecurringError("First payment deadline is required.");
      return;
    }
    try {
      setRecurringSaving(true);
      const res = await fetch("/api/recurring-cost-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: recurringForm.name.trim(),
          amount: amountNum,
          currency: recurringForm.currency,
          frequency: recurringForm.frequency,
          type: recurringForm.type,
          firstPaymentDeadline: recurringForm.firstPaymentDeadline,
          vendorId: recurringForm.vendorId,
          notes: recurringForm.notes.trim() || null,
          generateInstances: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add recurring expense");
      }
      await fetchTemplates();
      setRecurringDialogOpen(false);
      setRecurringForm({
        name: "",
        amount: "",
        currency: "JPY",
        frequency: "MONTHLY",
        type: "FIXED",
        firstPaymentDeadline: new Date().toISOString().split("T")[0],
        vendorId: "",
        notes: "",
      });
    } catch (err) {
      setRecurringError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setRecurringSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-primary dark:text-[#D4AF37]">
            receipt_long
          </span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Recurring expenses
            </h1>
            <p className="text-muted-foreground">
              Manage recurring expenses. They show up in Financial Operations → Transactions → Expenses when due.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setRecurringDialogOpen(true)}>
            <span className="material-symbols-outlined mr-2">add</span>
            Add a recurring expense
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recurring expense templates</CardTitle>
          <CardDescription>
            These generate due items that appear in Financial Operations → Transactions → Expenses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templatesLoading ? (
            <div className="text-sm text-muted-foreground py-6">Loading…</div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">
              No recurring expenses yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 font-semibold">Description</th>
                    <th className="text-left py-3 px-3 font-semibold">Vendor</th>
                    <th className="text-left py-3 px-3 font-semibold">Frequency</th>
                    <th className="text-left py-3 px-3 font-semibold">Amount</th>
                    <th className="text-left py-3 px-3 font-semibold">Next due</th>
                    <th className="text-left py-3 px-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => {
                    const nextUnpaid =
                      t.instances?.find((i) => !i.paidAt)?.dueDate ?? null;
                    const hasDue = Boolean(nextUnpaid);
                    return (
                      <tr key={t.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-3 font-medium">{t.name}</td>
                        <td className="py-3 px-3">
                          {t.vendor?.name || "—"}
                        </td>
                        <td className="py-3 px-3">{t.frequency}</td>
                        <td className="py-3 px-3">
                          {Number(t.amount).toLocaleString()} {t.currency || "JPY"}
                        </td>
                        <td className="py-3 px-3">
                          {hasDue
                            ? new Date(nextUnpaid as string).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-3 px-3">
                          {hasDue ? "Active" : "No upcoming items"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={recurringDialogOpen} onOpenChange={setRecurringDialogOpen}>
        <DialogContent className="max-w-lg p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Add a recurring expense</DialogTitle>
            <DialogDescription className="mt-1.5">
              Add a recurring expense. It will appear in Financial Operations → Transactions → Expenses when due.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddRecurring} className="px-6 pb-6 pt-1">
            {recurringError && (
              <p className="text-sm text-destructive mb-4">{recurringError}</p>
            )}
            <div className="space-y-5">
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={recurringForm.name}
                onChange={(e) =>
                  setRecurringForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Electricity, Rent"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 1,000,000"
                  value={recurringForm.amount}
                  onChange={(e) =>
                    setRecurringForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  onBlur={(e) => {
                    const parsed = parseAmountInput(e.target.value);
                    if (!isNaN(parsed) && parsed >= 0) {
                      setRecurringForm((f) => ({ ...f, amount: formatAmountForDisplay(parsed) }));
                    }
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={recurringForm.currency}
                  onValueChange={(v) =>
                    setRecurringForm((f) => ({ ...f, currency: v }))
                  }
                >
                  <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Vendor *</Label>
              <div className="flex gap-2">
                <Select
                  value={recurringForm.vendorId}
                  onValueChange={(v) =>
                    setRecurringForm((f) => ({ ...f, vendorId: v }))
                  }
                  required
                >
                  <SelectTrigger className="flex-1">
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowVendorForm(true)}
                  className="shrink-0"
                >
                  <span className="material-symbols-outlined mr-1 text-lg">add</span>
                  Add Vendor
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Frequency *</Label>
              <Select
                value={recurringForm.frequency}
                onValueChange={(v) =>
                  setRecurringForm((f) => ({ ...f, frequency: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="SEMI_YEARLY">Semi-Yearly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount type *</Label>
              <Select
                value={recurringForm.type}
                onValueChange={(v) =>
                  setRecurringForm((f) => ({ ...f, type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed (same amount each time)</SelectItem>
                  <SelectItem value="RECURRING">Variable (enter amount each time)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>First payment deadline *</Label>
              <DatePicker
                value={recurringForm.firstPaymentDeadline}
                onChange={(e) =>
                  setRecurringForm((f) => ({
                    ...f,
                    firstPaymentDeadline: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={recurringForm.notes}
                onChange={(e) =>
                  setRecurringForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
              />
            </div>
            </div>
            <DialogFooter className="mt-6 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRecurringDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={recurringSaving}>
                {recurringSaving ? "Saving..." : "Add recurring expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {showVendorForm && (
        <VendorForm
          vendor={null}
          onClose={async (createdVendorId?: string) => {
            if (createdVendorId) {
              await fetchVendors();
              // Fetch vendors again to get the updated list, then select the new vendor
              const response = await fetch("/api/vendors", { cache: "no-store" });
              if (response.ok) {
                const data = await response.json();
                setRecurringForm((f) => ({ ...f, vendorId: createdVendorId }));
              }
            }
            setShowVendorForm(false);
          }}
        />
      )}
    </div>
  );
}
