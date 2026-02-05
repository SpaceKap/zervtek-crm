"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

      {canViewShared ? (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "invoices" | "shared")} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="invoices">Customer Invoices</TabsTrigger>
            <TabsTrigger value="shared">Shared Invoices</TabsTrigger>
          </TabsList>
          <TabsContent value="invoices">
            <InvoicesList />
          </TabsContent>
          <TabsContent value="shared">
            <SharedInvoicesList
              ref={sharedInvoicesListRef}
              isAdmin={currentUser.role === UserRole.ADMIN}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <InvoicesList />
      )}
    </div>
  );
}
