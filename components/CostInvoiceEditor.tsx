"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { VendorForm } from "@/components/VendorForm";

interface CostInvoiceEditorProps {
  invoice: any;
  currentUser: any;
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
];

export function CostInvoiceEditor({
  invoice,
  currentUser,
}: CostInvoiceEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Calculate total revenue from all customer invoice charges including tax (discounts/deposits subtract)
  const calculateTotalRevenue = () => {
    let subtotal = 0;
    if (invoice.charges && invoice.charges.length > 0) {
      subtotal = getChargesSubtotal(invoice.charges);
    } else {
      // Fallback to cost invoice total or vehicle price
      subtotal = invoice.costInvoice?.totalRevenue
        ? parseFloat(invoice.costInvoice.totalRevenue.toString())
        : invoice.vehicle?.price
          ? parseFloat(invoice.vehicle.price.toString())
          : 0;
    }

    // Add tax if enabled (tax is revenue, not a cost)
    if (invoice.taxEnabled && invoice.taxRate) {
      const taxRate = parseFloat(invoice.taxRate.toString());
      const taxAmount = subtotal * (taxRate / 100);
      return subtotal + taxAmount;
    }

    return subtotal;
  };

  const [revenue, setRevenue] = useState(calculateTotalRevenue());
  const [revenueDisplay, setRevenueDisplay] = useState(
    calculateTotalRevenue().toLocaleString("en-US"),
  );
  const [costItems, setCostItems] = useState<CostItem[]>(
    invoice.costInvoice?.costItems || [],
  );
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);

  const canEdit =
    invoice.status !== "FINALIZED" &&
    (invoice.status === "DRAFT" ||
      invoice.status === "PENDING_APPROVAL" ||
      currentUser.role === "ADMIN");

  useEffect(() => {
    fetchVendors();
  }, []);

  // Update revenue when invoice charges or tax change (discounts/deposits subtract)
  useEffect(() => {
    if (invoice.charges && invoice.charges.length > 0) {
      let subtotal = getChargesSubtotal(invoice.charges);

      // Add tax if enabled
      if (invoice.taxEnabled && invoice.taxRate) {
        const taxRate = parseFloat(invoice.taxRate.toString());
        const taxAmount = subtotal * (taxRate / 100);
        subtotal += taxAmount;
      }

      // Only auto-update if there's no manually set total revenue in cost invoice
      if (!invoice.costInvoice?.totalRevenue) {
        setRevenue(subtotal);
        setRevenueDisplay(subtotal.toLocaleString("en-US"));
      }
    }
  }, [
    invoice.charges,
    invoice.taxEnabled,
    invoice.taxRate,
    invoice.costInvoice?.totalRevenue,
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/cost`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          totalRevenue: revenue,
          costItems: costItems.map((item) => ({
            id: item.id,
            description: item.description,
            amount: item.amount,
            vendorId: item.vendorId,
            paymentDate: item.paymentDate,
            category: item.category,
          })),
        }),
      });

      if (response.ok) {
        router.refresh();
        alert("Cost invoice saved successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error saving cost invoice:", error);
      alert("Failed to save cost invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setShowItemForm(true);
  };

  const handleEditItem = (item: CostItem) => {
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Delete this cost item?")) return;

    try {
      const response = await fetch(
        `/api/invoices/${invoice.id}/cost/items/${itemId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        setCostItems(costItems.filter((item) => item.id !== itemId));
        router.refresh();
      } else {
        alert("Failed to delete cost item");
      }
    } catch (error) {
      console.error("Error deleting cost item:", error);
      alert("Failed to delete cost item");
    }
  };

  const handleSaveItem = async (itemData: {
    description: string;
    amount: number;
    vendorId?: string;
    paymentDate?: string;
    paymentDeadline?: string;
    category?: string;
  }) => {
    try {
      const url = editingItem
        ? `/api/invoices/${invoice.id}/cost/items/${editingItem.id}`
        : `/api/invoices/${invoice.id}/cost/items`;
      const method = editingItem ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
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
      console.error("Error saving cost item:", error);
      alert("Failed to save cost item");
    }
  };

  const totalCost = costItems.reduce(
    (sum, item) => sum + parseFloat(item.amount.toString()),
    0,
  );
  const profit = revenue - totalCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  const vehicleDisplay = invoice.vehicle
    ? (invoice.vehicle.make && invoice.vehicle.model
        ? `${invoice.vehicle.year || ""} ${invoice.vehicle.make} ${invoice.vehicle.model}`.trim()
        : invoice.vehicle.vin)
    : "Container/Shipping";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Cost Invoice
          </h1>
          <p className="text-muted-foreground">
            Invoice {invoice.invoiceNumber} - {vehicleDisplay}
          </p>
        </div>
        <Link href={`/dashboard/invoices/${invoice.id}`}>
          <Button variant="outline">Back to Invoice</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Section */}
        <Card className="flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
                  <span className="material-symbols-outlined text-sm text-muted-foreground">
                    trending_up
                  </span>
                </div>
                <CardTitle>Revenue</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between py-2 px-3 border-b bg-muted/20">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Description
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Amount
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="divide-y divide-border/50">
                  {invoice.charges && invoice.charges.length > 0 ? (
                    invoice.charges.map((charge: any, index: number) => {
                      const amount = parseFloat(charge.amount.toString());
                      const chargeAmount = isChargeSubtracting(charge) ? -amount : amount;
                      return (
                        <div
                          key={charge.id || index}
                          className="flex items-center justify-between py-2 px-3 group bg-muted/20"
                        >
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground">
                              {charge.description}
                            </span>
                            {charge.chargeType && (
                              <span className="text-xs text-muted-foreground capitalize">
                                {typeof charge.chargeType === "string"
                                  ? charge.chargeType
                                      .replace(/_/g, " ")
                                      .toLowerCase()
                                  : charge.chargeType.name || ""}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <span className="text-sm font-medium font-data tabular-nums text-muted-foreground whitespace-nowrap">
                              ¥{chargeAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      No charges found
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2 border-t-2 border-foreground/20 bg-muted/30">
                <span className="text-sm font-bold">Total Revenue</span>
                <div className="flex items-center gap-2">
                  {canEdit ? (
                    <>
                      <Input
                        type="text"
                        value={revenueDisplay}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d]/g, "");
                          if (value === "") {
                            setRevenueDisplay("");
                            setRevenue(0);
                          } else {
                            const numValue = parseFloat(value);
                            setRevenue(numValue);
                            setRevenueDisplay(
                              parseInt(value, 10).toLocaleString("en-US"),
                            );
                          }
                        }}
                        className="w-32 text-right"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        <span className="material-symbols-outlined text-sm">
                          save
                        </span>
                      </Button>
                    </>
                  ) : (
                    <span className="text-base font-bold font-data tabular-nums">
                      ¥{revenue.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Costs Section */}
        <Card className="flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
                  <span className="material-symbols-outlined text-sm text-muted-foreground">
                    receipt_long
                  </span>
                </div>
                <CardTitle>Costs</CardTitle>
              </div>
              {canEdit && (
                <Button size="sm" onClick={handleAddItem}>
                  <span className="material-symbols-outlined text-sm mr-1">
                    add
                  </span>
                  Add
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/20">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Description
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Amount
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="divide-y divide-border/50">
                  {costItems.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      No cost items yet
                    </div>
                  ) : (
                    costItems.map((item) => {
                      const isSharedInvoice = item.id.startsWith("shared-");
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-2 px-3 group hover:bg-muted/30"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-muted-foreground">
                              {item.description}
                            </span>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {item.vendor?.name && (
                                <span>Vendor: {item.vendor.name}</span>
                              )}
                              {item.paymentDeadline && (
                                <span className="ml-2">
                                  Deadline:{" "}
                                  {format(
                                    new Date(item.paymentDeadline),
                                    "MMM dd, yyyy",
                                  )}
                                </span>
                              )}
                              {item.paymentDate && (
                                <span className="ml-2">
                                  Paid:{" "}
                                  {format(
                                    new Date(item.paymentDate),
                                    "MMM dd, yyyy",
                                  )}
                                </span>
                              )}
                              {item.category && (
                                <span className="ml-2">
                                  Category: {item.category}
                                </span>
                              )}
                              {isSharedInvoice && (
                                <span className="ml-2 text-blue-600 dark:text-blue-400">
                                  (From Shared Invoice)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium font-data tabular-nums">
                              ¥
                              {parseFloat(
                                item.amount.toString(),
                              ).toLocaleString()}
                            </span>
                            {canEdit && (
                              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (isSharedInvoice) {
                                      // For shared invoice items, show a message that editing should be done via shared invoice
                                      alert(
                                        "To edit shared invoice costs, please edit the shared invoice directly.",
                                      );
                                    } else {
                                      handleEditItem(item);
                                    }
                                  }}
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    edit
                                  </span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={async () => {
                                    if (
                                      !confirm(
                                        isSharedInvoice
                                          ? "Remove this vehicle from the shared invoice? This will remove the cost allocation."
                                          : "Delete this cost item?",
                                      )
                                    )
                                      return;
                                    try {
                                      if (isSharedInvoice) {
                                        // Delete shared invoice vehicle allocation
                                        const sharedInvoiceId = (item as any)
                                          .sharedInvoiceId;
                                        const vehicleId = (item as any)
                                          .vehicleId;
                                        const response = await fetch(
                                          `/api/shared-invoices/${sharedInvoiceId}/vehicles?vehicleId=${vehicleId}`,
                                          { method: "DELETE" },
                                        );
                                        if (response.ok) {
                                          router.refresh();
                                        } else {
                                          const error = await response.json();
                                          alert(
                                            error.error ||
                                              "Failed to remove vehicle from shared invoice",
                                          );
                                        }
                                      } else {
                                        handleDeleteItem(item.id);
                                      }
                                    } catch (error) {
                                      alert(
                                        isSharedInvoice
                                          ? "Failed to remove vehicle from shared invoice"
                                          : "Failed to delete cost item",
                                      );
                                    }
                                  }}
                                >
                                  <span className="material-symbols-outlined text-sm text-destructive">
                                    delete
                                  </span>
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2 border-t-2 border-foreground/20 bg-muted/30">
                <span className="text-sm font-bold">Total</span>
                <span className="text-base font-bold font-data tabular-nums">
                  ¥{totalCost.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit/Loss Summary */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <span
                  className={`material-symbols-outlined text-lg ${
                    profit >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {profit >= 0 ? "trending_up" : "trending_down"}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {profit >= 0 ? "Profit" : "Loss"}
                </p>
                <p
                  className={`text-2xl font-bold font-data tabular-nums tracking-tight ${
                    profit >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {profit >= 0 ? "+" : ""}¥{Math.abs(profit).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Margin</p>
                <p className="text-lg font-bold font-data tabular-nums">
                  {margin.toFixed(1)}%
                </p>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">ROI</p>
                <p className="text-lg font-bold font-data tabular-nums">
                  {roi.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            window.open(`/api/invoices/${invoice.id}/cost/pdf`, "_blank");
          }}
        >
          <span className="material-symbols-outlined text-lg mr-2">
            download
          </span>
          Download Cost Invoice PDF
        </Button>
        {canEdit && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Cost Invoice"}
          </Button>
        )}
      </div>

      {showItemForm && (
        <CostItemForm
          item={editingItem}
          vendors={vendors}
          onShowVendorForm={() => setShowVendorForm(true)}
          onSave={handleSaveItem}
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
  const [paymentDate, setPaymentDate] = useState(
    item?.paymentDate ? format(new Date(item.paymentDate), "yyyy-MM-dd") : "",
  );
  const [paymentDeadline, setPaymentDeadline] = useState(
    item?.paymentDeadline
      ? format(new Date(item.paymentDeadline), "yyyy-MM-dd")
      : new Date().toISOString().split("T")[0],
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
                required
              />
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
            <div className="flex justify-end gap-2">
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
