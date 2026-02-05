"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AccountantDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-4xl text-primary dark:text-[#D4AF37]">
          calculate
        </span>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Accountant Dashboard
          </h1>
          <p className="text-muted-foreground">
            Vehicle database and transaction management
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/dashboard/financial-operations?section=vehicles"
          className="bg-white dark:bg-[#1E1E1E] rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-3xl text-primary dark:text-[#D4AF37]">
              directions_car
            </span>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Vehicle Database
            </h2>
          </div>
          <p className="text-gray-600 dark:text-[#A1A1A1]">
            View all vehicles with documents, filter by date range, and manage
            shipping stages.
          </p>
        </Link>

        <Link
          href="/dashboard/financial-operations?section=transactions"
          className="bg-white dark:bg-[#1E1E1E] rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-3xl text-primary dark:text-[#D4AF37]">
              account_balance
            </span>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Transactions
            </h2>
          </div>
          <p className="text-gray-600 dark:text-[#A1A1A1]">
            View and manage all incoming payments and outgoing costs with
            calendar filtering.
          </p>
        </Link>
      </div>
    </div>
  );
}
