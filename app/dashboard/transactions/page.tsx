"use client";

import { useEffect, useState } from "react";
import { TransactionDirection, TransactionType } from "@prisma/client";
import { AddTransactionDialog } from "@/components/AddTransactionDialog";
import { DatePicker } from "@/components/ui/date-picker";

interface Transaction {
  id: string;
  direction: TransactionDirection;
  type: TransactionType;
  amount: string;
  currency: string;
  date: string;
  description: string | null;
  vendor: { id: string; name: string } | null;
  customer: { id: string; name: string; email: string | null } | null;
  vehicle: {
    id: string;
    vin: string;
    make: string | null;
    model: string | null;
  } | null;
  invoiceUrl: string | null;
  referenceNumber: string | null;
  notes: string | null;
  depositReceivedAt: string | null;
  depositProofUrl: string | null;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TransactionDirection>("INCOMING");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [activeTab, typeFilter, startDate, endDate]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("direction", activeTab);
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/transactions?${params}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`[Transactions Page] Fetched ${data.length} transactions`);
        setTransactions(data);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error(
          "[Transactions Page] API error:",
          response.status,
          errorData,
        );
        alert(
          `Failed to fetch transactions: ${errorData.error || errorData.details || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const typeLabels: Record<TransactionType, string> = {
    BANK_TRANSFER: "Bank Transfer",
    PAYPAL: "PayPal",
    CASH: "Cash",
    WISE: "Wise",
  };

  const totalAmount = transactions.reduce(
    (sum, t) => sum + parseFloat(t.amount),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-primary dark:text-[#D4AF37]">
            account_balance
          </span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Transactions
            </h1>
            <p className="text-muted-foreground">
              Track all incoming and outgoing payments
            </p>
          </div>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined">add</span>
          Add Transaction
        </button>
      </div>

      <div className="bg-white dark:bg-[#1E1E1E] rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-[#2C2C2C]">
          <div className="flex">
            <button
              onClick={() => setActiveTab("INCOMING")}
              className={`px-6 py-3 font-medium ${
                activeTab === "INCOMING"
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 dark:text-[#A1A1A1]"
              }`}
            >
              Incoming Payments
            </button>
            <button
              onClick={() => setActiveTab("OUTGOING")}
              className={`px-6 py-3 font-medium ${
                activeTab === "OUTGOING"
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 dark:text-[#A1A1A1]"
              }`}
            >
              Outgoing Costs
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex gap-4 mb-4 flex-wrap">
            <DatePicker
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
              className="px-4 py-2"
            />
            <DatePicker
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
              className="px-4 py-2"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-[#2C2C2C] rounded-lg bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4 p-4 bg-gray-50 dark:bg-[#2C2C2C] rounded-lg">
            <div className="text-sm text-gray-600 dark:text-[#A1A1A1]">
              Total Amount
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalAmount.toLocaleString()} JPY
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#2C2C2C]">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      {activeTab === "INCOMING" ? "Customer" : "Vendor"}
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Vehicle
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Description
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-gray-200 dark:border-[#2C2C2C] hover:bg-gray-50 dark:hover:bg-[#2C2C2C]"
                    >
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded text-sm">
                          {typeLabels[transaction.type]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-semibold">
                        {parseFloat(transaction.amount).toLocaleString()}{" "}
                        {transaction.currency}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {activeTab === "INCOMING"
                          ? transaction.customer?.name || "N/A"
                          : transaction.vendor?.name || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {transaction.vehicle
                          ? `${transaction.vehicle.vin} (${transaction.vehicle.make} ${transaction.vehicle.model})`
                          : "N/A"}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        <div className="flex flex-wrap items-center gap-2">
                          {transaction.description || "N/A"}
                          {transaction.description === "Deposit" && (
                            <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              Deposit
                            </span>
                          )}
                          {transaction.description === "Deposit" &&
                            !transaction.depositReceivedAt && (
                              <span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                                Pending
                              </span>
                            )}
                          {transaction.depositProofUrl && (
                            <a
                              href={transaction.depositProofUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              Proof
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {transaction.description === "Deposit" &&
                            !transaction.depositReceivedAt && (
                              <>
                                <button
                                  onClick={async () => {
                                    if (
                                      !confirm(
                                        "Mark this deposit as received?",
                                      )
                                    )
                                      return;
                                    try {
                                      const res = await fetch(
                                        `/api/transactions/${transaction.id}`,
                                        {
                                          method: "PATCH",
                                          headers: {
                                            "Content-Type":
                                              "application/json",
                                          },
                                          body: JSON.stringify({
                                            depositReceivedAt: new Date().toISOString(),
                                          }),
                                        },
                                      );
                                      if (res.ok) fetchTransactions();
                                      else
                                        alert(
                                          "Failed to mark as received",
                                        );
                                    } catch (e) {
                                      alert("Failed to mark as received");
                                    }
                                  }}
                                  className="text-sm text-green-600 hover:underline dark:text-green-400"
                                >
                                  Mark received
                                </button>
                                <button
                                  onClick={async () => {
                                    if (
                                      !confirm(
                                        "Delete this pending deposit? It will be removed from the customer's wallet too.",
                                      )
                                    )
                                      return;
                                    try {
                                      const res = await fetch(
                                        `/api/transactions/${transaction.id}`,
                                        { method: "DELETE" },
                                      );
                                      if (res.ok) fetchTransactions();
                                      else alert("Failed to delete");
                                    } catch (e) {
                                      alert("Failed to delete");
                                    }
                                  }}
                                  className="text-sm text-red-600 hover:underline dark:text-red-400"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/transactions/${transaction.id}`,
                                );
                                if (response.ok) {
                                  const fullTransaction =
                                    await response.json();
                                  setEditingTransaction(fullTransaction);
                                  setDialogOpen(true);
                                } else {
                                  alert("Failed to load transaction details");
                                }
                              } catch (error) {
                                console.error(
                                  "Error fetching transaction:",
                                  error,
                                );
                                alert("Failed to load transaction details");
                              }
                            }}
                            className="text-primary hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AddTransactionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingTransaction(null);
          }
        }}
        onSuccess={() => {
          fetchTransactions();
          setEditingTransaction(null);
        }}
        defaultDirection={activeTab}
        transaction={editingTransaction}
      />
    </div>
  );
}
