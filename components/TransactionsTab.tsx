"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Transaction {
  id: string;
  type: "invoice" | "payment";
  date: string;
  paymentDeadline?: string;
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
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "paymentDate" | "paymentDeadline">("date");
  const [filterType, setFilterType] = useState<"all" | "invoice" | "payment">("all");

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

  // Filter and sort transactions
  useEffect(() => {
    let filtered = [...transactions];

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    // Sort transactions
    filtered.sort((a, b) => {
      let dateA: Date;
      let dateB: Date;

      if (sortBy === "paymentDeadline") {
        dateA = a.paymentDeadline ? new Date(a.paymentDeadline) : new Date(0);
        dateB = b.paymentDeadline ? new Date(b.paymentDeadline) : new Date(0);
      } else if (sortBy === "paymentDate") {
        dateA = a.date ? new Date(a.date) : new Date(0);
        dateB = b.date ? new Date(b.date) : new Date(0);
      } else {
        // Default: sort by transaction date
        dateA = new Date(a.date);
        dateB = new Date(b.date);
      }

      return dateB.getTime() - dateA.getTime(); // Most recent first
    });

    setFilteredTransactions(filtered);
  }, [transactions, sortBy, filterType]);

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
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-gray-900 dark:text-white">
            All Transactions
          </CardTitle>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Label htmlFor="filter-type" className="text-sm">Filter:</Label>
              <Select value={filterType} onValueChange={(value: "all" | "invoice" | "payment") => setFilterType(value)}>
                <SelectTrigger id="filter-type" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="sort-by" className="text-sm">Sort by:</Label>
              <Select value={sortBy} onValueChange={(value: "date" | "paymentDate" | "paymentDeadline") => setSortBy(value)}>
                <SelectTrigger id="sort-by" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Transaction Date</SelectItem>
                  <SelectItem value="paymentDate">Payment Date</SelectItem>
                  <SelectItem value="paymentDeadline">Payment Deadline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTransactions.length === 0 ? (
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
                    {sortBy === "date" ? "Date" : sortBy === "paymentDate" ? "Payment Date" : "Payment Deadline"}
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
                  {sortBy !== "paymentDeadline" && (
                    <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                      Payment Deadline
                    </th>
                  )}
                  {sortBy === "paymentDeadline" && (
                    <th className="text-left text-sm font-semibold text-gray-900 dark:text-white p-3">
                      Payment Date
                    </th>
                  )}
                  <th className="text-right text-sm font-semibold text-gray-900 dark:text-white p-3">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr
                    key={`${transaction.type}-${transaction.id}`}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="p-3 text-sm text-gray-900 dark:text-white">
                      {sortBy === "paymentDeadline" && transaction.paymentDeadline
                        ? formatDate(transaction.paymentDeadline)
                        : sortBy === "paymentDate"
                        ? formatDate(transaction.date)
                        : formatDate(transaction.date)}
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
                    {sortBy !== "paymentDeadline" && (
                      <td className="p-3 text-sm text-gray-900 dark:text-white">
                        {transaction.paymentDeadline ? (
                          formatDate(transaction.paymentDeadline)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                    {sortBy === "paymentDeadline" && (
                      <td className="p-3 text-sm text-gray-900 dark:text-white">
                        {transaction.type === "payment" && transaction.date ? (
                          formatDate(transaction.date)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
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
