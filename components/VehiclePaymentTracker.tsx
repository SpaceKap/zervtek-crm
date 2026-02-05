"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { AddTransactionDialog } from "./AddTransactionDialog";
import { TransactionDirection } from "@prisma/client";

interface PaymentData {
  totalCharges: string;
  totalReceived: string;
  balanceDue: string;
  invoices: Array<{
    id: string;
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
    useState<TransactionDirection>("OUTGOING");

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

  const handleAddCharge = () => {
    setTransactionDirection("OUTGOING");
    setTransactionDialogOpen(true);
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

  const balanceDue = parseFloat(paymentData.balanceDue);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-[#2C2C2C] rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-[#A1A1A1]">
            Total Charges
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {parseFloat(paymentData.totalCharges).toLocaleString()} JPY
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-[#2C2C2C] rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-[#A1A1A1]">
            Total Received
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {parseFloat(paymentData.totalReceived).toLocaleString()} JPY
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-[#2C2C2C] rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-[#A1A1A1]">
            Balance Due
          </div>
          <div
            className={`text-2xl font-bold ${
              balanceDue > 0
                ? "text-red-600 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
            }`}
          >
            {balanceDue.toLocaleString()} JPY
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleAddCharge}>Add Charge</Button>
        <Button onClick={handleAddPayment}>Add Payment</Button>
      </div>

      {paymentData.invoices.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold">Related Invoices</h4>
          {paymentData.invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="p-4 bg-gray-50 dark:bg-[#2C2C2C] rounded-lg"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{invoice.invoiceNumber}</div>
                  <div className="text-sm text-gray-600 dark:text-[#A1A1A1]">
                    Status: {invoice.paymentStatus}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {invoice.charges
                      .reduce(
                        (sum, charge) => sum + parseFloat(charge.amount),
                        0,
                      )
                      .toLocaleString()}{" "}
                    JPY
                  </div>
                </div>
              </div>
            </div>
          ))}
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
      />
    </div>
  );
}
