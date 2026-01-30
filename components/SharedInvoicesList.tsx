"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { SharedInvoiceForm } from "./SharedInvoiceForm";

interface SharedInvoice {
  id: string;
  type: "FORWARDER" | "CONTAINER";
  invoiceNumber: string;
  totalAmount: number;
  date: string;
  vehicles: Array<{
    id: string;
    allocatedAmount: number;
    vehicle: {
      id: string;
      vin: string;
      make: string | null;
      model: string | null;
      year: number | null;
    };
  }>;
}

interface SharedInvoicesListProps {
  isAdmin?: boolean;
}

export function SharedInvoicesList({
  isAdmin = false,
}: SharedInvoicesListProps) {
  const router = useRouter();
  const [sharedInvoices, setSharedInvoices] = useState<SharedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SharedInvoice | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Debug: Log isAdmin prop
  useEffect(() => {
    console.log("SharedInvoicesList - isAdmin:", isAdmin);
  }, [isAdmin]);

  useEffect(() => {
    fetchSharedInvoices();
  }, []);

  const fetchSharedInvoices = async () => {
    try {
      const response = await fetch("/api/shared-invoices");
      if (response.ok) {
        const data = await response.json();
        setSharedInvoices(data);
      }
    } catch (error) {
      console.error("Error fetching shared invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingInvoice(null);
    fetchSharedInvoices();
    router.refresh(); // Refresh page data to reflect updates
  };

  const handleDelete = async (invoiceId: string, invoiceNumber: string) => {
    if (
      !confirm(
        `Are you sure you want to delete shared invoice ${invoiceNumber}? This will remove the cost allocation from all associated vehicles and recalculate their cost invoices. This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setDeletingId(invoiceId);
      const response = await fetch(`/api/shared-invoices/${invoiceId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchSharedInvoices();
        router.refresh(); // Refresh page data to reflect updates
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete shared invoice");
      }
    } catch (error) {
      console.error("Error deleting shared invoice:", error);
      alert("Failed to delete shared invoice");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div></div>
        <Button
          onClick={() => {
            setEditingInvoice(null);
            setShowForm(true);
          }}
        >
          <span className="material-symbols-outlined text-lg mr-2">add</span>
          New Shared Invoice
        </Button>
      </div>
      <Card>
        <CardContent className="p-4">
          {sharedInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No shared invoices found
            </div>
          ) : (
            <div className="space-y-2">
              {sharedInvoices.map((invoice) => {
                const vehicleDisplay = (v: any) => {
                  if (v.vehicle.make && v.vehicle.model) {
                    return `${v.vehicle.year || ""} ${v.vehicle.make} ${v.vehicle.model} - ${v.vehicle.vin}`.trim();
                  }
                  return v.vehicle.vin;
                };

                return (
                  <div
                    key={invoice.id}
                    className="p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-end gap-2 mb-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingInvoice(invoice);
                          setShowForm(true);
                        }}
                      >
                        Edit
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleDelete(invoice.id, invoice.invoiceNumber)
                          }
                          disabled={deletingId === invoice.id}
                        >
                          {deletingId === invoice.id ? (
                            "Deleting..."
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm mr-1">
                                delete
                              </span>
                              Delete
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">
                            {invoice.invoiceNumber}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              invoice.type === "FORWARDER"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                            }`}
                          >
                            {invoice.type === "FORWARDER"
                              ? "Forwarder"
                              : "Container"}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {format(new Date(invoice.date), "MMM dd, yyyy")} •{" "}
                          {invoice.vehicles.length} vehicle
                          {invoice.vehicles.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          ¥
                          {parseFloat(
                            invoice.totalAmount.toString(),
                          ).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ¥
                          {(
                            parseFloat(invoice.totalAmount.toString()) /
                            invoice.vehicles.length
                          ).toLocaleString()}{" "}
                          per vehicle
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-muted-foreground mb-1">
                        Vehicles:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {invoice.vehicles.map((v) => (
                          <span
                            key={v.id}
                            className="text-xs px-2 py-1 bg-muted rounded"
                          >
                            {vehicleDisplay(v)} (¥
                            {parseFloat(
                              v.allocatedAmount.toString(),
                            ).toLocaleString()}
                            )
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <SharedInvoiceForm
          invoice={
            editingInvoice
              ? {
                  id: editingInvoice.id,
                  type: editingInvoice.type,
                  totalAmount: editingInvoice.totalAmount,
                  date: editingInvoice.date,
                  vehicles: editingInvoice.vehicles.map((v) => ({
                    vehicleId: v.vehicle.id,
                  })),
                }
              : null
          }
          onClose={handleFormClose}
        />
      )}
    </>
  );
}
