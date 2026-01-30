"use client";

import { useState } from "react";
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

interface ContainerInvoiceDetailProps {
  containerInvoice: any;
  currentUser: any;
}

export function ContainerInvoiceDetail({
  containerInvoice,
  currentUser,
}: ContainerInvoiceDetailProps) {
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
    if (vehicle.vin) parts.push(`VIN: ${vehicle.vin}`);
    return parts.join(" ");
  };

  const subtotal = containerInvoice.vehicles.reduce(
    (sum: number, v: any) => sum + parseFloat(v.allocatedAmount.toString()),
    0,
  );

  const taxAmount = containerInvoice.taxEnabled
    ? subtotal * (parseFloat(containerInvoice.taxRate.toString()) / 100)
    : 0;

  const total = subtotal + taxAmount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Container Invoice {containerInvoice.invoiceNumber}
          </h1>
          <p className="text-muted-foreground">
            Customer: {containerInvoice.customer.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              window.open(
                `/api/container-invoices/${containerInvoice.id}/pdf`,
                "_blank",
              );
            }}
          >
            <span className="material-symbols-outlined text-sm mr-2">
              preview
            </span>
            Preview PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.open(
                `/api/container-invoices/${containerInvoice.id}/pdf?download=true`,
                "_blank",
              );
            }}
          >
            <span className="material-symbols-outlined text-sm mr-2">
              download
            </span>
            Download PDF
          </Button>
          <Link href="/dashboard/invoices">
            <Button variant="outline">Back to Invoices</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Number:</span>
              <span className="font-medium">
                {containerInvoice.invoiceNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Issue Date:</span>
              <span>
                {format(new Date(containerInvoice.issueDate), "MMM dd, yyyy")}
              </span>
            </div>
            {containerInvoice.dueDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date:</span>
                <span>
                  {format(new Date(containerInvoice.dueDate), "MMM dd, yyyy")}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Container:</span>
              <span>{containerInvoice.sharedInvoice.invoiceNumber}</span>
            </div>
            {containerInvoice.taxEnabled && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax Rate:</span>
                <span>{parseFloat(containerInvoice.taxRate.toString())}%</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-muted-foreground">Name:</span>{" "}
              <span className="font-medium">
                {containerInvoice.customer.name}
              </span>
            </div>
            {containerInvoice.customer.email && (
              <div>
                <span className="text-muted-foreground">Email:</span>{" "}
                {containerInvoice.customer.email}
              </div>
            )}
            {containerInvoice.customer.phone && (
              <div>
                <span className="text-muted-foreground">Phone:</span>{" "}
                {containerInvoice.customer.phone}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicles</CardTitle>
          <CardDescription>
            {containerInvoice.vehicles.length} vehicle
            {containerInvoice.vehicles.length !== 1 ? "s" : ""} in container
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {containerInvoice.vehicles.map((v: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{formatVehicle(v.vehicle)}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">
                    ¥{formatCurrency(parseFloat(v.allocatedAmount.toString()))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>¥{formatCurrency(subtotal)}</span>
            </div>
            {containerInvoice.taxEnabled && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax:</span>
                <span>¥{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t text-lg font-bold">
              <span>Total:</span>
              <span>¥{formatCurrency(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {containerInvoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {containerInvoice.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
