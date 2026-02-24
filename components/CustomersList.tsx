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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CustomerForm } from "./CustomerForm";
import { staffDisplayName } from "@/lib/staff-display";
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
  assignedTo?: { id: string; name: string | null; email: string } | null;
}

interface StaffUser {
  id: string;
  name: string | null;
  email: string;
}

export function CustomersList() {
  const { data: session } = useSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [assignCustomer, setAssignCustomer] = useState<Customer | null>(null);
  const [assignStaffId, setAssignStaffId] = useState<string>("");
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  useEffect(() => {
    fetch("/api/users?excludeRole=ACCOUNTANT")
      .then((r) => (r.ok ? r.json() : []))
      .then(setStaff)
      .catch(() => setStaff([]));
  }, []);

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
                  className="flex items-center justify-between gap-4 p-3 border rounded-lg hover:bg-accent"
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
                  <div className="text-sm text-muted-foreground shrink-0 min-w-[140px] flex items-center gap-1.5">
                    {customer.assignedTo ? (
                      <>
                        <span>{staffDisplayName(customer.assignedTo.name, customer.assignedTo.email)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-1.5 text-primary"
                          onClick={(e) => {
                            e.preventDefault();
                            setAssignCustomer(customer);
                            setAssignStaffId(customer.assignedTo!.id);
                          }}
                        >
                          Change
                        </Button>
                      </>
                    ) : (
                      <>
                        <span>No person in charge</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-1.5 text-primary"
                          onClick={(e) => {
                            e.preventDefault();
                            setAssignCustomer(customer);
                            setAssignStaffId("");
                          }}
                        >
                          Select
                        </Button>
                      </>
                    )}
                  </div>
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

      <Dialog open={!!assignCustomer} onOpenChange={(open) => !open && setAssignCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Person in charge</DialogTitle>
            <DialogDescription>
              Assign a staff member to {assignCustomer?.name}. This is synced to the customer portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Staff member</Label>
            <Select value={assignStaffId || "none"} onValueChange={setAssignStaffId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {staff.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {staffDisplayName(u.name, u.email)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignCustomer(null)}>
              Cancel
            </Button>
            <Button
              disabled={assigning}
              onClick={async () => {
                if (!assignCustomer) return;
                setAssigning(true);
                try {
                  const res = await fetch(`/api/customers/${assignCustomer.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      assignedToId: assignStaffId && assignStaffId !== "none" ? assignStaffId : null,
                    }),
                  });
                  if (res.ok) {
                    setAssignCustomer(null);
                    setAssignStaffId("");
                    fetchCustomers();
                  } else {
                    const d = await res.json();
                    alert(d.error || "Failed to update");
                  }
                } catch (e) {
                  alert("Failed to update");
                } finally {
                  setAssigning(false);
                }
              }}
            >
              {assigning ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
