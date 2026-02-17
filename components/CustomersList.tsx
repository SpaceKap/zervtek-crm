"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CustomerForm } from "./CustomerForm";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  billingAddress: any;
  shippingAddress: any;
  portOfDestination: string | null;
  createdAt: string;
}

export function CustomersList() {
  const { data: session } = useSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const fetchCustomers = async () => {
    try {
      const url = search
        ? `/api/customers?search=${encodeURIComponent(search)}`
        : "/api/customers";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCustomer(null);
    fetchCustomers();
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Customers</CardTitle>
              <CardDescription>
                Search and manage customer information
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <span className="material-symbols-outlined text-lg mr-2">
                add
              </span>
              Add Customer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search customers by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>

          {customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No customers found
            </div>
          ) : (
            <div className="space-y-2">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                >
                  <Link
                    href={`/dashboard/customers/${customer.id}`}
                    className="flex-1 min-w-0 hover:opacity-90 transition-opacity"
                  >
                    <div className="font-medium text-foreground">
                      {customer.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {customer.email && <span>{customer.email}</span>}
                      {customer.email && customer.phone && <span> • </span>}
                      {customer.phone && <span>{customer.phone}</span>}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    {session?.user?.role === "ADMIN" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                        onClick={async (e) => {
                          e.preventDefault();
                          if (!confirm(`Permanently delete customer "${customer.name}"? All their vehicles, invoices, and transactions will be removed.`)) return;
                          try {
                            const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || "Failed to delete");
                            fetchCustomers();
                          } catch (err) {
                            alert(err instanceof Error ? err.message : "Failed to delete customer");
                          }
                        }}
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </Button>
                    )}
                    <Link href={`/dashboard/customers/${customer.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(customer)}
                    >
                      Edit
                    </Button>
                    <Link href={`/dashboard/invoices/new?customerId=${customer.id}`}>
                      <Button size="sm">
                        Create Invoice
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <CustomerForm
          customer={editingCustomer || undefined}
          onClose={handleFormClose}
        />
      )}
    </>
  );
}
