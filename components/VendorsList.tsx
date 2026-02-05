"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { VendorForm } from "./VendorForm";

import { VendorCategory } from "@prisma/client";

interface Vendor {
  id: string;
  name: string;
  email?: string | null;
  category?: VendorCategory;
  createdAt: string;
}

const categoryLabels: Record<VendorCategory, string> = {
  DEALERSHIP: "Dealership",
  AUCTION_HOUSE: "Auction House",
  TRANSPORT_VENDOR: "Transport Company",
  GARAGE: "Garage",
  FREIGHT_VENDOR: "Freight Company",
  FORWARDING_VENDOR: "Forwarder", // Map to Forwarder for display
  FORWARDER: "Forwarder",
  SHIPPING_AGENT: "Shipping Agent",
  YARD: "Yard",
};

export function VendorsList() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<VendorCategory | "ALL">(
    "ALL",
  );

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const baseUrl =
        categoryFilter !== "ALL"
          ? `/api/vendors?category=${categoryFilter}`
          : "/api/vendors";
      // Add cache-busting parameter to ensure fresh data
      const separator = baseUrl.includes("?") ? "&" : "?";
      const url = `${baseUrl}${separator}_t=${Date.now()}`;
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  const handleCreate = () => {
    setEditingVendor(null);
    setShowForm(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vendor?")) {
      return;
    }

    try {
      const response = await fetch(`/api/vendors/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchVendors();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error deleting vendor:", error);
      alert("Failed to delete vendor");
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingVendor(null);
    fetchVendors();
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Vendors</CardTitle>
              <CardDescription>
                Manage vendors - anyone we pay for any reason.
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <span className="material-symbols-outlined text-lg mr-2">
                add
              </span>
              Add Vendor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Category Filter */}
          <div className="mb-6 flex items-center gap-4">
            <Label>Filter by Category:</Label>
            <Select
              value={categoryFilter}
              onValueChange={(value) =>
                setCategoryFilter(value as VendorCategory | "ALL")
              }
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {Object.entries(categoryLabels)
                  .filter(([value]) => value !== "FORWARDING_VENDOR") // Hide FORWARDING_VENDOR, use FORWARDER instead
                  .map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {vendors.length} vendor{vendors.length !== 1 ? "s" : ""}
            </div>
          </div>

          {vendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No vendors found. Click &quot;Add Vendor&quot; to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="group relative p-4 border rounded-lg hover:border-primary/50 hover:shadow-md transition-all bg-card"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-lg text-muted-foreground">
                          store
                        </span>
                        <h3 className="font-semibold text-sm truncate">
                          {vendor.name}
                        </h3>
                      </div>
                      {vendor.category && (
                        <div className="mb-1">
                          <span className="inline-block px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                            {vendor.category === "FORWARDING_VENDOR"
                              ? "Forwarder"
                              : categoryLabels[vendor.category]}
                          </span>
                        </div>
                      )}
                      {vendor.email && (
                        <p className="text-xs text-muted-foreground mb-1">
                          {vendor.email}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Created{" "}
                        {new Date(vendor.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(vendor)}
                    >
                      <span className="material-symbols-outlined text-sm mr-1">
                        edit
                      </span>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(vendor.id)}
                    >
                      <span className="material-symbols-outlined text-sm">
                        delete
                      </span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <VendorForm vendor={editingVendor} onClose={handleFormClose} />
      )}
    </>
  );
}
