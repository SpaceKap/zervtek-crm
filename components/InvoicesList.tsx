"use client";

import { useEffect, useState } from "react";
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

export function InvoicesList() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customer");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, customerId]);

  const fetchInvoices = async () => {
    try {
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

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (charges: Array<{ amount: number }>) => {
    return charges.reduce(
      (sum, charge) => sum + parseFloat(charge.amount.toString()),
      0,
    );
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="FINALIZED">Finalized</option>
          </select>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No invoices found
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map((invoice) => {
              const total = calculateTotal(invoice.charges);
              const vehicleDisplay =
                invoice.vehicle.make && invoice.vehicle.model
                  ? `${invoice.vehicle.year || ""} ${invoice.vehicle.make} ${invoice.vehicle.model}`.trim()
                  : invoice.vehicle.vin;

              return (
                <Link
                  key={invoice.id}
                  href={`/dashboard/invoices/${invoice.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold">
                          {invoice.invoiceNumber}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            statusColors[invoice.status] || statusColors.DRAFT
                          }`}
                        >
                          {statusLabels[invoice.status] || invoice.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div>{invoice.customer.name}</div>
                        <div>{vehicleDisplay}</div>
                        <div className="mt-1">
                          {format(new Date(invoice.createdAt), "MMM dd, yyyy")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        ¥{total.toLocaleString()}
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
