"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Transaction {
  id: string;
  type: "invoice" | "payment";
  date: string;
  invoiceNumber: string;
  customer: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  sharedInvoiceId?: string;
  vehicle: {
    id: string;
    vin: string;
    make: string | null;
    model: string | null;
    year: number | null;
  };
  amount: number;
  status?: string;
  description: string;
  vendor?: {
    id: string;
    name: string;
  } | null;
  category?: string | null;
}

export function TransactionsTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const response = await fetch("/api/stats/transactions");
        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }
        const data = await response.json();
        setTransactions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const vehicleDisplay = (vehicle: Transaction["vehicle"]) => {
    if (vehicle.make && vehicle.model) {
      return `${vehicle.year || ""} ${vehicle.make} ${vehicle.model} - ${vehicle.vin}`.trim();
    }
    return vehicle.vin;
  };

  if (loading) {
    return (
      <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
        <CardContent className="py-12 text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-[#2C2C2C] mb-4 block animate-spin">
            refresh
          </span>
          <p className="text-muted-foreground">Loading transactions...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
        <CardContent className="py-12 text-center">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4 block">
            error
          </span>
          <p className="text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
      <CardHeader>
        <CardTitle className="text-xl text-gray-900 dark:text-white">
          All Transactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="py-12 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-[#2C2C2C] mb-4 block">
              receipt_long
            </span>
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
                  <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                    Date
                  </th>
                  <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                    Type
                  </th>
                  <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                    Invoice #
                  </th>
                  <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                    Customer
                  </th>
                  <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                    Vehicle
                  </th>
                  <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                    Description
                  </th>
                  <th className="text-right text-sm font-semibold text-gray-900 dark:text-white p-3">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={`${transaction.type}-${transaction.id}`}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="p-3 text-sm text-gray-900 dark:text-white">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === "invoice"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        }`}
                      >
                        {transaction.type === "invoice" ? (
                          <>
                            <span className="material-symbols-outlined text-sm mr-1">
                              receipt
                            </span>
                            Invoice
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-sm mr-1">
                              payments
                            </span>
                            Payment
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-3 text-sm font-mono text-gray-900 dark:text-white">
                      {transaction.invoiceNumber}
                    </td>
                    <td className="p-3 text-sm text-gray-900 dark:text-white">
                      {transaction.customer
                        ? transaction.customer.name ||
                          transaction.customer.email ||
                          "N/A"
                        : "N/A"}
                    </td>
                    <td className="p-3 text-sm text-gray-900 dark:text-white">
                      {vehicleDisplay(transaction.vehicle)}
                    </td>
                    <td className="p-3 text-sm text-gray-900 dark:text-white">
                      <div className="flex flex-col">
                        <span>{transaction.description}</span>
                        {transaction.type === "payment" &&
                          transaction.vendor && (
                            <span className="text-xs text-muted-foreground mt-1">
                              Vendor: {transaction.vendor.name}
                            </span>
                          )}
                        {transaction.type === "payment" &&
                          transaction.category && (
                            <span className="text-xs text-muted-foreground">
                              Category: {transaction.category}
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="p-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
