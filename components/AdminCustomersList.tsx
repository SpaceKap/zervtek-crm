"use client";

import { useEffect, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  billingAddress: any;
  shippingAddress: any;
  portOfDestination: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    invoices: number;
    vehicles: number;
    transactions: number;
  };
}

export function AdminCustomersList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Fetch customers on mount and when search changes (debounced)
  useEffect(() => {
    const timer = setTimeout(
      () => {
        fetchCustomers();
      },
      search ? 300 : 0,
    ); // Immediate on mount, debounced on search

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const url = search
        ? `/api/customers?search=${encodeURIComponent(search)}`
        : "/api/customers";

      if (process.env.NODE_ENV === "development") {
        console.log("[Customers List] Fetching customers from:", url);
      }
      const response = await fetch(url);

      if (process.env.NODE_ENV === "development") {
        console.log("[Customers List] Response status:", response.status);
      }

      if (response.ok) {
        const data = await response.json();
        if (process.env.NODE_ENV === "development") {
          console.log(`[Customers List] Fetched ${data.length} customers`);
        }
        setCustomers(Array.isArray(data) ? data : []);
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            error: `HTTP ${response.status}: ${response.statusText}`,
          };
        }
        console.error(
          "[Customers List] API error:",
          response.status,
          errorData,
        );
        const errorMessage =
          errorData.details || errorData.error || `HTTP ${response.status}`;
        console.error("[Customers List] Error message:", errorMessage);
        // Don't show alert on initial load, only on user actions
        if (customers.length > 0) {
          alert(`Failed to fetch customers: ${errorMessage}`);
        }
        setCustomers([]); // Clear customers on error
      }
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      // Don't show alert on initial load, only on user actions
      if (customers.length > 0) {
        alert(
          `Failed to fetch customers: ${error?.message || "Network error. Please check your connection and try again."}`,
        );
      }
      setCustomers([]); // Clear customers on error
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

  const formatAddress = (address: any): string => {
    if (!address) return "—";
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zip) parts.push(address.zip);
    if (address.country) parts.push(address.country);
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Customers</CardTitle>
              <CardDescription>
                Complete customer database with all information
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <span className="material-symbols-outlined text-lg mr-2">
                add
              </span>
              Create a new customer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Search customers by name, email, phone, or country..."
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
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Billing Address</TableHead>
                    <TableHead>Shipping Address</TableHead>
                    <TableHead>Port of Destination</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
                          className="text-primary dark:text-[#D4AF37] hover:underline"
                        >
                          {customer.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="text-sm">{customer.email}</div>
                          )}
                          {customer.phone && (
                            <div className="text-sm text-muted-foreground">
                              {customer.phone}
                            </div>
                          )}
                          {!customer.email && !customer.phone && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.country || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs text-sm">
                          {formatAddress(customer.billingAddress)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs text-sm">
                          {formatAddress(customer.shippingAddress)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.portOfDestination || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.notes ? (
                          <div className="max-w-xs text-sm text-muted-foreground line-clamp-2">
                            {customer.notes}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(customer.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(customer)}
                          >
                            <span className="material-symbols-outlined text-sm mr-1">
                              edit
                            </span>
                            Edit
                          </Button>
                          <Link
                            href={`/dashboard/invoices?customer=${customer.id}`}
                          >
                            <Button variant="outline" size="sm">
                              <span className="material-symbols-outlined text-sm mr-1">
                                receipt
                              </span>
                              Invoices
                            </Button>
                          </Link>
                          <Link
                            href={`/dashboard/customers/${customer.id}`}
                          >
                            <Button variant="outline" size="sm">
                              <span className="material-symbols-outlined text-sm mr-1">
                                directions_car
                              </span>
                              Vehicles
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
