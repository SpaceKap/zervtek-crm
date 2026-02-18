"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getChargesSubtotal } from "@/lib/charge-utils";
import { Button } from "./ui/button";
import { AddTransactionDialog } from "./AddTransactionDialog";
import { TransactionDirection } from "@prisma/client";
import { Card, CardContent } from "./ui/card";

interface PaymentData {
  totalRevenue: string;
  totalCost: string;
  profit: string;
  margin: string;
  totalCharges: string;
  totalReceived: string;
  balanceDue: string;
  customerId?: string | null;
  invoices: Array<{
    id: string;
    customerId?: string;
    invoiceNumber: string;
    charges: Array<{
      id: string;
      description: string;
      amount: string;
    }>;
    paymentStatus: string;
  }>;
}

interface VehiclePaymentTrackerProps {
  vehicleId: string;
}

export function VehiclePaymentTracker({
  vehicleId,
}: VehiclePaymentTrackerProps) {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionDirection, setTransactionDirection] =
    useState<TransactionDirection>("INCOMING");

  useEffect(() => {
    fetchPayments();
  }, [vehicleId]);

  const fetchPayments = async () => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/payments`);
      if (response.ok) {
        const data = await response.json();
        setPaymentData(data);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = () => {
    setTransactionDirection("INCOMING");
    setTransactionDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-4">Loading payment data...</div>;
  }

  if (!paymentData) {
    return <div className="text-center py-4">No payment data found</div>;
  }

  const revenue = parseFloat(paymentData.totalRevenue);
  const cost = parseFloat(paymentData.totalCost);
  const profit = parseFloat(paymentData.profit);
  const margin = parseFloat(paymentData.margin);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ¥{revenue.toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                  attach_money
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total Cost
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ¥{cost.toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">
                  receipt
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-l-4 ${profit >= 0 ? "border-l-green-500" : "border-l-red-500"}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {profit >= 0 ? "Profit" : "Loss"}
                </p>
                <p
                  className={`text-2xl font-bold mt-1 ${profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {profit >= 0 ? "+" : ""}¥
                  {Math.abs(profit).toLocaleString()}
                </p>
              </div>
              <div
                className={`h-12 w-12 rounded-lg flex items-center justify-center ${profit >= 0 ? "bg-green-100 dark:bg-green-900/20" : "bg-red-100 dark:bg-red-900/20"}`}
              >
                <span
                  className={`material-symbols-outlined ${profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {profit >= 0 ? "trending_up" : "trending_down"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Margin
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {margin.toFixed(1)}%
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400">
                  percent
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Payments Received
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ¥{parseFloat(paymentData.totalReceived || "0").toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">
                  check_circle
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Payment Due
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ¥{parseFloat(paymentData.balanceDue || "0").toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">
                  schedule
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Payment Button */}
      <div className="flex gap-2">
        <Button onClick={handleAddPayment}>
          <span className="material-symbols-outlined text-lg mr-2">
            payments
          </span>
          Add Payment
        </Button>
      </div>

      {/* Related Invoices */}
      {paymentData.invoices.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-lg">Related Invoices</h4>
          {paymentData.invoices.map((invoice) => {
            const invoiceTotal = getChargesSubtotal(invoice.charges);
            return (
              <div
                key={invoice.id}
                className="p-4 bg-gray-50 dark:bg-[#2C2C2C] rounded-lg border border-gray-200 dark:border-gray-800"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{invoice.invoiceNumber}</div>
                    <div className="text-sm text-gray-600 dark:text-[#A1A1A1]">
                      Status: {invoice.paymentStatus.replace("_", " ")}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div className="font-medium">
                      ¥{invoiceTotal.toLocaleString()}
                    </div>
                    <Link href={`/dashboard/invoices/${invoice.id}`}>
                      <Button variant="outline" size="sm">
                        View Invoice
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddTransactionDialog
        open={transactionDialogOpen}
        onOpenChange={(open) => {
          setTransactionDialogOpen(open);
        }}
        onSuccess={() => {
          fetchPayments();
        }}
        defaultDirection={transactionDirection}
        defaultVehicleId={vehicleId}
        defaultCustomerId={
          paymentData?.customerId ??
          paymentData?.invoices?.[0]?.customerId ??
          undefined
        }
        defaultInvoiceId={
          paymentData?.invoices?.find(
            (inv) =>
              inv.paymentStatus === "PENDING" ||
              inv.paymentStatus === "PARTIALLY_PAID",
          )?.id
        }
      />
    </div>
  );
}
