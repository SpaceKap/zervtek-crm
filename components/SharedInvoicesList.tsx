"use client";

import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
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

export interface SharedInvoicesListRef {
  openNewForm: () => void;
}

export const SharedInvoicesList = forwardRef<
  SharedInvoicesListRef,
  SharedInvoicesListProps
>(({ isAdmin = false }, ref) => {
  const router = useRouter();
  const [sharedInvoices, setSharedInvoices] = useState<SharedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SharedInvoice | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSharedInvoices();
  }, []);

  useImperativeHandle(ref, () => ({
    openNewForm: () => {
      setEditingInvoice(null);
      setShowForm(true);
    },
  }));

  const fetchSharedInvoices = async () => {
    try {
      const response = await fetch("/api/shared-invoices");
      if (response.ok) {
        const data = await response.json();
        // Handle both old format (array) and new format (object with pagination)
        if (Array.isArray(data)) {
          setSharedInvoices(data);
        } else {
          setSharedInvoices(data.sharedInvoices || []);
        }
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
      <Card>
        <CardContent className="p-6">
          <div className="mb-6 flex items-center justify-end">
            <Button
              onClick={() => {
                setEditingInvoice(null);
                setShowForm(true);
              }}
            >
              <span className="material-symbols-outlined text-lg mr-2">
                add
              </span>
              New Shared Invoice
            </Button>
          </div>

          {sharedInvoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-5xl text-muted-foreground">
                  receipt_long
                </span>
                <div>
                  <p className="text-lg font-medium text-foreground mb-1">
                    No shared invoices found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Create a shared invoice to allocate costs across multiple
                    vehicles
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setEditingInvoice(null);
                    setShowForm(true);
                  }}
                  className="mt-2"
                >
                  <span className="material-symbols-outlined text-lg mr-2">
                    add
                  </span>
                  Create Shared Invoice
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
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
                    className="p-5 border rounded-lg hover:bg-accent/50 hover:border-primary/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-base">
                            {invoice.invoiceNumber}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded font-medium ${
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
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-xs">
                              calendar_today
                            </span>
                            {invoice.date &&
                            !isNaN(new Date(invoice.date).getTime())
                              ? format(new Date(invoice.date), "MMM dd, yyyy")
                              : "N/A"}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-xs">
                              directions_car
                            </span>
                            {invoice.vehicles.length} vehicle
                            {invoice.vehicles.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <div className="font-semibold text-lg">
                          ¥
                          {parseFloat(
                            invoice.totalAmount.toString(),
                          ).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          ¥
                          {(
                            parseFloat(invoice.totalAmount.toString()) /
                            invoice.vehicles.length
                          ).toLocaleString()}{" "}
                          per vehicle
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          Allocated Vehicles:
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingInvoice(invoice);
                              setShowForm(true);
                            }}
                          >
                            <span className="material-symbols-outlined text-sm mr-1">
                              edit
                            </span>
                            Edit
                          </Button>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(invoice.id, invoice.invoiceNumber);
                              }}
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
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {invoice.vehicles.map((v) => (
                          <span
                            key={v.id}
                            className="text-xs px-2.5 py-1.5 bg-muted rounded-md font-medium"
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
});

SharedInvoicesList.displayName = "SharedInvoicesList";
