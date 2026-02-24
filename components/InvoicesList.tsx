"use client";

import { useEffect, useState, useCallback } from "react";
import { getChargesSubtotal } from "@/lib/charge-utils";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string | null;
  };
  vehicle: {
    id: string;
    vin: string;
    make: string | null;
    model: string | null;
    year: number | null;
  };
  charges: Array<{
    id: string;
    description: string;
    amount: number;
  }>;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  PENDING_APPROVAL:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  FINALIZED: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  FINALIZED: "Finalized",
};

interface InvoicesListProps {
  /** When this changes, the list refetches (e.g. when user switches to Invoices tab). */
  refreshTrigger?: number;
}

export function InvoicesList({ refreshTrigger = 0 }: InvoicesListProps) {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customer");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      let url = "/api/invoices";
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (customerId) {
        params.append("customer", customerId);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        cache: "no-store",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        // Handle both old format (array) and new format (object with pagination)
        if (Array.isArray(data)) {
          setInvoices(data);
        } else {
          setInvoices(data.invoices || []);
        }
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, customerId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices, refreshTrigger]);

  const calculateTotal = (charges: Array<{ amount: number | string; chargeType?: string | { name?: string } | null }>) =>
    getChargesSubtotal(charges);

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="FINALIZED">Finalized</option>
            </select>
          </div>
          <Link href="/dashboard/invoices/new">
            <Button>
              <span className="material-symbols-outlined text-lg mr-2">
                add
              </span>
              New Invoice
            </Button>
          </Link>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-5xl text-muted-foreground">
                receipt_long
              </span>
              <div>
                <p className="text-lg font-medium text-foreground mb-1">
                  No invoices found
                </p>
                <p className="text-sm text-muted-foreground">
                  Get started by creating your first invoice
                </p>
              </div>
              <Link href="/dashboard/invoices/new">
                <Button className="mt-2">
                  <span className="material-symbols-outlined text-lg mr-2">
                    add
                  </span>
                  Create Invoice
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => {
              const total = calculateTotal(invoice.charges);
              const vehicleDisplay = invoice.vehicle
                ? (invoice.vehicle.make && invoice.vehicle.model
                    ? `${invoice.vehicle.year || ""} ${invoice.vehicle.make} ${invoice.vehicle.model}`.trim()
                    : invoice.vehicle.vin)
                : "—";

              return (
                <Link
                  key={invoice.id}
                  href={`/dashboard/invoices/${invoice.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 hover:border-primary/20 transition-all cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-base">
                          {invoice.invoiceNumber}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${
                            statusColors[invoice.status] || statusColors.DRAFT
                          }`}
                        >
                          {statusLabels[invoice.status] || invoice.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-xs">
                            person
                          </span>
                          {invoice.customer.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-xs">
                            directions_car
                          </span>
                          {vehicleDisplay}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-xs">
                            calendar_today
                          </span>
                          {invoice.createdAt &&
                          !isNaN(new Date(invoice.createdAt).getTime())
                            ? format(
                                new Date(invoice.createdAt),
                                "MMM dd, yyyy",
                              )
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <div className="font-semibold text-lg">
                        ¥{total.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {invoice.charges.length} item
                        {invoice.charges.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
