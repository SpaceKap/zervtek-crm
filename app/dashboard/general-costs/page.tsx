"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function GeneralCostsPage() {
  const [costs, setCosts] = useState<GeneralCost[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<GeneralCost | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    currency: "JPY",
    date: new Date().toISOString().split("T")[0],
    vendorId: "",
    invoiceUrl: "",
    notes: "",
  });

  useEffect(() => {
    fetchCosts();
    fetchVendors();
  }, [startDate, endDate]);

  const fetchCosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/general-costs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCosts(data);
      }
    } catch (error) {
      console.error("Error fetching general costs:", error);
    } finally {
      setLoading(false);
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

  const handleOpenDialog = (cost?: GeneralCost) => {
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
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCost(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        handleCloseDialog();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save general cost");
      }
    } catch (error) {
      console.error("Error saving general cost:", error);
      alert("Failed to save general cost");
    }
  };

  const handleDelete = async (id: string) => {
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

  const totalAmount = costs.reduce(
    (sum, c) => sum + parseFloat(c.amount),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-primary dark:text-[#D4AF37]">
            receipt_long
          </span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              General Costs
            </h1>
            <p className="text-muted-foreground">
              Track non-vehicle related costs (electricity, rent, fuel, etc.)
            </p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <span className="material-symbols-outlined mr-2">add</span>
          Add General Cost
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>General Costs</CardTitle>
              <CardDescription>
                All non-vehicle related expenses
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-bold">
                {totalAmount.toLocaleString()} JPY
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : costs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No general costs found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Description</th>
                    <th className="text-left py-3 px-4 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Vendor</th>
                    <th className="text-left py-3 px-4 font-semibold">Notes</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.map((cost) => (
                    <tr key={cost.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        {new Date(cost.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-medium">{cost.description}</td>
                      <td className="py-3 px-4">
                        {parseFloat(cost.amount).toLocaleString()} {cost.currency}
                      </td>
                      <td className="py-3 px-4">
                        {cost.vendor?.name || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {cost.notes || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(cost)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cost.id)}
                            className="text-destructive"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCost ? "Edit General Cost" : "Add General Cost"}
            </DialogTitle>
            <DialogDescription>
              Record a non-vehicle related expense
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Description *</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="e.g., Electricity, Rent, Fuel"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value })
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
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label>Vendor (Optional)</Label>
              <Select
                value={formData.vendorId}
                onValueChange={(value) =>
                  setFormData({ ...formData, vendorId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Invoice URL (Optional)</Label>
              <Input
                type="url"
                value={formData.invoiceUrl}
                onChange={(e) =>
                  setFormData({ ...formData, invoiceUrl: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
