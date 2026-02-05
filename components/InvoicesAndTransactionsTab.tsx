"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoicesList } from "./InvoicesList";
import { TransactionsTab } from "./TransactionsTab";

export function InvoicesAndTransactionsTab() {
  return (
    <Tabs defaultValue="invoices" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
        <TabsTrigger value="invoices" className="text-sm font-medium">
          Invoices
        </TabsTrigger>
        <TabsTrigger value="transactions" className="text-sm font-medium">
          Transactions
        </TabsTrigger>
      </TabsList>

      <TabsContent value="invoices" className="mt-6">
        <InvoicesList />
      </TabsContent>

      <TabsContent value="transactions" className="mt-6">
        <TransactionsTab />
      </TabsContent>
    </Tabs>
  );
}
