"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";

interface ContainerInvoice {
  id: string;
  invoiceNumber: string;
  customer: {
    id: string;
    name: string;
    email: string | null;
  };
  sharedInvoice: {
    id: string;
    invoiceNumber: string;
    type: string;
    totalAmount: number;
    date: string;
  };
  totalAmount: number;
  issueDate: string;
  dueDate: string | null;
  taxEnabled: boolean;
  vehicles: Array<{
    vehicle: {
      id: string;
      vin: string;
      make: string | null;
      model: string | null;
      year: number | null;
    };
    allocatedAmount: number;
  }>;
  createdAt: string;
}

export function ContainerInvoicesList() {
  const [containerInvoices, setContainerInvoices] = useState<
    ContainerInvoice[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContainerInvoices();
  }, []);

  const fetchContainerInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/container-invoices");
      if (response.ok) {
        const data = await response.json();
        setContainerInvoices(data);
      }
    } catch (error) {
      console.error("Error fetching container invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatVehicle = (vehicle: {
    vin: string;
    make: string | null;
    model: string | null;
    year: number | null;
  }) => {
    const parts = [];
    if (vehicle.year) parts.push(vehicle.year);
    if (vehicle.make) parts.push(vehicle.make);
    if (vehicle.model) parts.push(vehicle.model);
    if (vehicle.vin) parts.push(`(${vehicle.vin})`);
    return parts.join(" ");
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading container invoices...
      </div>
    );
  }

  if (containerInvoices.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No container invoices found. Create one from a shared container
          invoice.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {containerInvoices.map((invoice) => {
        const subtotal = invoice.vehicles.reduce(
          (sum, v) => sum + parseFloat(v.allocatedAmount.toString()),
          0,
        );
        const taxAmount = invoice.taxEnabled ? subtotal * 0.1 : 0;
        const total = subtotal + taxAmount;

        return (
          <Card key={invoice.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {invoice.invoiceNumber}
                  </CardTitle>
                  <CardDescription>
                    Customer: {invoice.customer.name}
                    {invoice.customer.email && ` (${invoice.customer.email})`}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    ¥{formatCurrency(total)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {invoice.vehicles.length} vehicle
                    {invoice.vehicles.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Issue Date:</span>{" "}
                    {format(new Date(invoice.issueDate), "MMM dd, yyyy")}
                  </div>
                  {invoice.dueDate && (
                    <div>
                      <span className="text-muted-foreground">Due Date:</span>{" "}
                      {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Container:</span>{" "}
                    {invoice.sharedInvoice.invoiceNumber}
                  </div>
                  {invoice.taxEnabled && (
                    <div>
                      <span className="text-muted-foreground">Tax:</span> 10%
                    </div>
                  )}
                </div>

                <div className="border-t pt-3">
                  <div className="text-sm font-medium mb-2">Vehicles:</div>
                  <div className="space-y-1">
                    {invoice.vehicles.map((v, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {formatVehicle(v.vehicle)}
                        </span>
                        <span className="font-medium">
                          ¥
                          {formatCurrency(
                            parseFloat(v.allocatedAmount.toString()),
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(
                        `/api/container-invoices/${invoice.id}/pdf?download=true`,
                        "_blank",
                      );
                    }}
                  >
                    <span className="material-symbols-outlined text-sm mr-2">
                      download
                    </span>
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(
                        `/api/container-invoices/${invoice.id}/pdf`,
                        "_blank",
                      );
                    }}
                  >
                    <span className="material-symbols-outlined text-sm mr-2">
                      preview
                    </span>
                    Preview PDF
                  </Button>
                  <Link href={`/dashboard/container-invoices/${invoice.id}`}>
                    <Button size="sm">
                      <span className="material-symbols-outlined text-sm mr-2">
                        visibility
                      </span>
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
