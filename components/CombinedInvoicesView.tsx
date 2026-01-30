"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InvoicesList } from "./InvoicesList";
import {
  SharedInvoicesList,
  SharedInvoicesListRef,
} from "./SharedInvoicesList";
import { UserRole } from "@prisma/client";

interface CombinedInvoicesViewProps {
  currentUser: {
    id: string;
    role: UserRole;
  };
}

export function CombinedInvoicesView({
  currentUser,
}: CombinedInvoicesViewProps) {
  const [activeTab, setActiveTab] = useState<"invoices" | "shared">("invoices");
  const sharedInvoicesListRef = useRef<SharedInvoicesListRef>(null);
  // Sales staff, managers, and admins can all view and create shared invoices
  const canViewShared =
    currentUser.role === UserRole.SALES ||
    currentUser.role === UserRole.MANAGER ||
    currentUser.role === UserRole.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Invoices
          </h1>
          <p className="text-muted-foreground">
            Manage customer invoices
            {canViewShared ? " and shared invoices" : ""}
          </p>
        </div>
        {activeTab === "invoices" && (
          <Link href="/dashboard/invoices/new">
            <Button>
              <span className="material-symbols-outlined text-lg mr-2">
                add
              </span>
              New Invoice
            </Button>
          </Link>
        )}
        {activeTab === "shared" && canViewShared && (
          <Button
            onClick={() => {
              sharedInvoicesListRef.current?.openNewForm();
            }}
          >
            <span className="material-symbols-outlined text-lg mr-2">add</span>
            New Shared Invoice
          </Button>
        )}
      </div>

      {canViewShared && (
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === "invoices"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Customer Invoices
          </button>
          <button
            onClick={() => setActiveTab("shared")}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === "shared"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Shared Invoices
          </button>
        </div>
      )}

      {activeTab === "invoices" && <InvoicesList />}
      {activeTab === "shared" && (
        <SharedInvoicesList
          ref={sharedInvoicesListRef}
          isAdmin={currentUser.role === UserRole.ADMIN}
        />
      )}
    </div>
  );
}
