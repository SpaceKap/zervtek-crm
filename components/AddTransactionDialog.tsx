"use client";

import { useState, useEffect, useRef } from "react";
import { TransactionDirection, TransactionType } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { VendorForm } from "./VendorForm";
import { DatePicker } from "@/components/ui/date-picker";

interface Vendor {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
}

interface Vehicle {
  id: string;
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
}

interface Transaction {
  id: string;
  direction: TransactionDirection;
  type: TransactionType;
  amount: string;
  currency?: string;
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
  paymentDeadline?: string | null;
}

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  status: string;
  paymentStatus: string;
  customer?: { id: string; name: string; email: string | null } | null;
  vehicle?: { id: string; vin: string; make: string | null; model: string | null; year: number | null } | null;
}

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultDirection?: TransactionDirection;
  transaction?: Transaction | null;
  defaultVehicleId?: string;
  defaultCustomerId?: string;
  defaultInvoiceId?: string;
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultDirection = "INCOMING",
  transaction = null,
  defaultVehicleId,
  defaultCustomerId,
  defaultInvoiceId,
}: AddTransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<InvoiceOption[]>([]);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const vendorDropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    direction: defaultDirection,
    type: "" as TransactionType | "",
    amount: "",
    currency: "JPY",
    exchangeRate: "",
    date: "",
    vendorId: "",
    customerId: "",
    vehicleId: "",
    invoiceId: "",
    description: "",
    paymentDeadline: new Date().toISOString().split("T")[0],
  });

  // Close vendor dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        vendorDropdownRef.current &&
        !vendorDropdownRef.current.contains(event.target as Node)
      ) {
        setVendorDropdownOpen(false);
      }
    };

    if (vendorDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [vendorDropdownOpen]);

  useEffect(() => {
    if (open) {
      fetchVendors();
      fetchCustomers();
      fetchVehicles();

      // If editing, populate form with transaction data
      if (transaction) {
        // Safely parse the date
        let dateValue = new Date().toISOString().split("T")[0]; // Default to today
        if (transaction.date) {
          const dateObj = new Date(transaction.date);
          if (!isNaN(dateObj.getTime())) {
            dateValue = dateObj.toISOString().split("T")[0];
          }
        }

        // For outgoing transactions, if customer exists but no vendor, it might be a refund
        const vendorId = transaction.vendor?.id || "";
        const customerId = transaction.customer?.id || "";
        // If it's outgoing and has customer but no vendor, treat customer as the "vendor" for display
        const displayVendorId =
          transaction.direction === "OUTGOING" && !vendorId && customerId
            ? customerId
            : vendorId;

        setFormData({
          direction: transaction.direction,
          type: transaction.type,
          amount: formatAmount(transaction.amount),
          currency: transaction.currency || "",
          exchangeRate: (transaction as any).exchangeRate || "",
          date: dateValue,
          vendorId: displayVendorId,
          customerId:
            transaction.direction === "OUTGOING" && !vendorId && customerId
              ? ""
              : customerId,
          vehicleId: transaction.vehicle?.id || "",
          invoiceId: (transaction as any).invoiceId || "",
          description: transaction.description || transaction.notes || "",
          paymentDeadline: transaction.paymentDeadline
            ? new Date(transaction.paymentDeadline).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
        });
        setUploadedFileUrl(transaction.invoiceUrl);
        if (transaction.vendor) {
          setVendorSearch(transaction.vendor.name);
        } else if (
          transaction.direction === "OUTGOING" &&
          transaction.customer
        ) {
          // For refunds, show customer name in vendor search
          setVendorSearch(
            transaction.customer.name || transaction.customer.email || "",
          );
        }
      } else {
        // Reset form when creating new
        setFormData({
          direction: defaultDirection,
          type: "" as TransactionType | "",
          amount: "",
          currency: defaultDirection === "OUTGOING" ? "JPY" : "JPY",
          exchangeRate: "",
          date: "",
          vendorId: "",
          customerId: defaultCustomerId || "",
          vehicleId: defaultVehicleId || "",
          invoiceId: defaultInvoiceId || "",
          description: "",
          paymentDeadline: new Date().toISOString().split("T")[0],
        });
        setUploadedFileUrl(null);
        setVendorSearch("");
      }
      setVendorDropdownOpen(false);
    }
  }, [
    open,
    defaultDirection,
    transaction,
    defaultCustomerId,
    defaultVehicleId,
    defaultInvoiceId,
  ]);

  // Fetch unpaid invoices for INCOMING payments (by vehicle when on vehicle page, or all)
  useEffect(() => {
    if (formData.direction === "INCOMING") {
      const params = new URLSearchParams();
      params.set("paymentStatus", "PENDING,PARTIALLY_PAID");
      if (defaultVehicleId) params.set("vehicleId", defaultVehicleId);
      else if (formData.customerId) params.set("customer", formData.customerId);
      fetch(`/api/invoices?${params}`)
        .then((res) => res.json())
        .then((data) => {
          setCustomerInvoices(data?.invoices ?? []);
        })
        .catch(() => setCustomerInvoices([]));
    } else {
      setCustomerInvoices([]);
    }
  }, [formData.direction, formData.customerId, defaultVehicleId]);

  const fetchVendors = async () => {
    try {
      const response = await fetch("/api/vendors", {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
        // If we have a selected vendor, update the search text
        if (formData.vendorId) {
          const selectedVendor = data.find(
            (v: Vendor) => v.id === formData.vendorId,
          );
          if (selectedVendor) {
            setVendorSearch(selectedVendor.name);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setCustomers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch("/api/vehicles");
      if (response.ok) {
        const data = await response.json();
        setVehicles(Array.isArray(data) ? data.slice(0, 100) : []); // Limit to first 100 for performance
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch vehicles:", response.status, errorData);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("context", "transaction");
      uploadFormData.append(
        "expenseDate",
        formData.date || new Date().toISOString().split("T")[0],
      );

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUploadedFileUrl(data.url);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to upload file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Format number with commas
  const formatAmount = (value: string | number) => {
    // Convert to string if it's a number
    let stringValue =
      typeof value === "number" ? value.toString() : String(value || "");

    // Remove all commas first (in case they're already there)
    stringValue = stringValue.replace(/,/g, "");

    // Remove all non-digit characters except decimal point
    let numericValue = stringValue.replace(/[^\d.]/g, "");

    // Handle empty string
    if (!numericValue) return "";

    // Ensure only one decimal point
    const decimalIndex = numericValue.indexOf(".");
    if (decimalIndex !== -1) {
      numericValue =
        numericValue.substring(0, decimalIndex + 1) +
        numericValue.substring(decimalIndex + 1).replace(/\./g, "");
    }

    // Split by decimal point
    const parts = numericValue.split(".");

    // Format the integer part with commas
    if (parts[0]) {
      // Use a simple approach: add commas from right to left every 3 digits
      const integerPart = parts[0];
      let formatted = "";
      let count = 0;
      for (let i = integerPart.length - 1; i >= 0; i--) {
        formatted = integerPart[i] + formatted;
        count++;
        if (count % 3 === 0 && i > 0) {
          formatted = "," + formatted;
        }
      }
      parts[0] = formatted;
    }

    // Join parts back together
    return parts.join(".");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Remove commas for validation
    const amountValue = formData.amount.replace(/,/g, "");
    if (!formData.type || !amountValue || !formData.paymentDeadline) {
      alert("Please fill in all required fields");
      return;
    }

    if (formData.direction === "OUTGOING" && !formData.vendorId) {
      alert("Please select a vendor for outgoing transactions");
      return;
    }

    // Validate exchange rate for foreign currencies
    if (
      (formData.currency === "USD" || formData.currency === "EUR") &&
      !formData.exchangeRate
    ) {
      alert(`Please enter the exchange rate for ${formData.currency} to JPY`);
      return;
    }

    if (
      (formData.currency === "USD" || formData.currency === "EUR") &&
      formData.exchangeRate &&
      (isNaN(parseFloat(formData.exchangeRate)) ||
        parseFloat(formData.exchangeRate) <= 0)
    ) {
      alert("Please enter a valid exchange rate greater than 0");
      return;
    }

    try {
      setLoading(true);
      const url = transaction
        ? `/api/transactions/${transaction.id}`
        : "/api/transactions";
      const method = transaction ? "PATCH" : "POST";

      // Check if vendorId is actually a customer (for refunds)
      const isCustomerSelected = customers.some(
        (c) => c.id === formData.vendorId,
      );
      const finalVendorId = isCustomerSelected
        ? null
        : formData.vendorId || null;
      const finalCustomerId = isCustomerSelected
        ? formData.vendorId
        : formData.customerId || null;

      // When editing, preserve existing relation/display fields so they don't disappear after save
      const existing = transaction ? (transaction as any) : null;
      const payload = {
        ...formData,
        amount: formData.amount.replace(/,/g, ""), // Remove commas before sending
        vendorId: finalVendorId,
        customerId: finalCustomerId,
        vehicleId: formData.vehicleId || (existing?.vehicleId ?? null),
        invoiceId: formData.invoiceId || (existing?.invoiceId ?? null),
        invoiceUrl: uploadedFileUrl ?? existing?.invoiceUrl ?? null,
        referenceNumber: existing?.referenceNumber ?? null,
        description: formData.description || null,
        notes: existing?.notes ?? null,
        date: formData.date || null,
        paymentDeadline: formData.paymentDeadline,
        exchangeRate:
          formData.currency !== "JPY" && formData.exchangeRate
            ? parseFloat(formData.exchangeRate)
            : null,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const error = await response.json();
        alert(
          error.error ||
            `Failed to ${transaction ? "update" : "create"} transaction`,
        );
      }
    } catch (error) {
      console.error(
        `Error ${transaction ? "updating" : "creating"} transaction:`,
        error,
      );
      alert(`Failed to ${transaction ? "update" : "create"} transaction`);
    } finally {
      setLoading(false);
    }
  };

  const handleVendorCreated = async (createdVendorId?: string) => {
    if (createdVendorId) {
      await fetchVendors();
      // Fetch vendors again to get the updated list, then find the new vendor
      const response = await fetch("/api/vendors", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const newVendor = data.find((v: Vendor) => v.id === createdVendorId);
        setFormData((prev) => ({ ...prev, vendorId: createdVendorId }));
        setVendorSearch(newVendor?.name || "");
        setVendorDropdownOpen(false);
      }
    }
    setShowVendorForm(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>
              {transaction ? "Edit Transaction" : "Add Transaction"}
            </DialogTitle>
            <DialogDescription>
              {transaction
                ? "Update transaction details"
                : formData.direction === "INCOMING"
                  ? "Record an incoming payment from a customer"
                  : "Record an outgoing cost or payment"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
            <div>
              <Label className="text-sm font-medium">Direction *</Label>
              <Select
                value={formData.direction}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    direction: value as TransactionDirection,
                    vendorId: "",
                    customerId: "",
                    currency: value === "OUTGOING" ? "JPY" : formData.currency,
                  })
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOMING">Incoming Payment</SelectItem>
                  <SelectItem value="OUTGOING">Outgoing Cost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">
                  Transaction Type *
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as TransactionType })
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="PAYPAL">PayPal</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="WISE">Wise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Currency *</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      currency: value,
                      exchangeRate:
                        value !== "JPY" ? formData.exchangeRate : "",
                    })
                  }
                  disabled={formData.direction === "OUTGOING"}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JPY">JPY</SelectItem>
                    {formData.direction === "INCOMING" && (
                      <>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {formData.direction === "OUTGOING" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Outgoing costs are only in JPY
                  </p>
                )}
              </div>
              {(formData.currency === "USD" || formData.currency === "EUR") && (
                <div>
                  <Label className="text-sm font-medium">
                    Exchange Rate ({formData.currency}/JPY) *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.exchangeRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        exchangeRate: e.target.value,
                      })
                    }
                    placeholder="e.g., 150.00"
                    className="mt-1.5"
                  />
                  {formData.exchangeRate &&
                    formData.amount &&
                    !isNaN(parseFloat(formData.exchangeRate)) &&
                    !isNaN(parseFloat(formData.amount.replace(/,/g, ""))) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        JPY Equivalent:{" "}
                        <span className="font-semibold">
                          {(
                            parseFloat(formData.amount.replace(/,/g, "")) *
                            parseFloat(formData.exchangeRate)
                          ).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          JPY
                        </span>
                      </p>
                    )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Amount *</Label>
                <Input
                  type="text"
                  value={formData.amount}
                  onChange={(e) => {
                    const formatted = formatAmount(e.target.value);
                    setFormData({ ...formData, amount: formatted });
                  }}
                  placeholder="0.00"
                  required
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Date and Payment Deadline in one row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Date (Optional)</Label>
                <DatePicker
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">
                  Payment Deadline *
                </Label>
                <DatePicker
                  value={formData.paymentDeadline}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentDeadline: e.target.value,
                    })
                  }
                  required
                  className="mt-1.5"
                />
              </div>
            </div>

            {formData.direction === "INCOMING" && (
              <>
                <div>
                  <Label className="text-sm font-medium">
                    Customer
                  </Label>
                  <Select
                    value={formData.customerId || undefined}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        customerId: value || "",
                        invoiceId: "",
                      })
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue
                        placeholder={
                          defaultVehicleId
                            ? "Pre-filled from vehicle"
                            : "Select customer to filter invoices"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}{" "}
                          {customer.email && `(${customer.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {defaultVehicleId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Customer and invoice are pre-filled from the vehicle
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Link to Invoice
                  </Label>
                  <Select
                    value={formData.invoiceId || undefined}
                    onValueChange={(value) => {
                      const inv = customerInvoices.find((i) => i.id === value);
                      setFormData({
                        ...formData,
                        invoiceId: value || "",
                        customerId: inv?.customer?.id ? inv.customer.id : formData.customerId,
                        vehicleId: inv?.vehicle?.id ? inv.vehicle.id : formData.vehicleId,
                      });
                    }}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue
                        placeholder={
                          formData.customerId
                            ? "Select invoice for this customer"
                            : "Select customer first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {customerInvoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.invoiceNumber}
                          {inv.vehicle && ` - ${inv.vehicle.make} ${inv.vehicle.model} ${inv.vehicle.year}`}
                          {` (${inv.paymentStatus})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {customerInvoices.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      No unpaid invoices found{defaultVehicleId ? " for this vehicle" : formData.customerId ? " for this customer" : ""}.
                    </p>
                  )}
                </div>
              </>
            )}

            {formData.direction === "OUTGOING" && (
              <div>
                <Label className="text-sm font-medium">Vendor/Customer *</Label>
                <div className="flex gap-2 mt-1.5 relative">
                  <div className="flex-1 relative" ref={vendorDropdownRef}>
                    <Input
                      type="text"
                      placeholder="Search vendors or customers..."
                      value={vendorSearch}
                      onChange={(e) => {
                        setVendorSearch(e.target.value);
                        setVendorDropdownOpen(true);
                        // Clear selection if search doesn't match selected vendor/customer
                        if (formData.vendorId) {
                          const selectedVendor = vendors.find(
                            (v) => v.id === formData.vendorId,
                          );
                          const selectedCustomer = customers.find(
                            (c) => c.id === formData.vendorId,
                          );
                          const selected = selectedVendor || selectedCustomer;
                          if (
                            selected &&
                            !(selected.name || (selected as any).email || "")
                              .toLowerCase()
                              .includes(e.target.value.toLowerCase())
                          ) {
                            setFormData({ ...formData, vendorId: "" });
                          }
                        }
                      }}
                      onFocus={() => {
                        setVendorDropdownOpen(true);
                        // Show selected vendor/customer name when focusing if not searching
                        if (!vendorSearch && formData.vendorId) {
                          const selectedVendor = vendors.find(
                            (v) => v.id === formData.vendorId,
                          );
                          const selectedCustomer = customers.find(
                            (c) => c.id === formData.vendorId,
                          );
                          const selected = selectedVendor || selectedCustomer;
                          if (selected) {
                            setVendorSearch(
                              selected.name || (selected as any).email || "",
                            );
                          }
                        }
                      }}
                      className="w-full"
                    />
                    {vendorDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-md shadow-lg max-h-60 overflow-auto">
                        {/* Vendors Section */}
                        {vendors.filter((vendor) =>
                          vendor.name
                            .toLowerCase()
                            .includes(vendorSearch.toLowerCase()),
                        ).length > 0 && (
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b">
                            Vendors
                          </div>
                        )}
                        {vendors
                          .filter((vendor) =>
                            vendor.name
                              .toLowerCase()
                              .includes(vendorSearch.toLowerCase()),
                          )
                          .map((vendor) => (
                            <button
                              key={vendor.id}
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  vendorId: vendor.id,
                                });
                                setVendorSearch(vendor.name);
                                setVendorDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] cursor-pointer flex items-center gap-2"
                            >
                              <span>{vendor.name}</span>
                              {formData.vendorId === vendor.id && (
                                <span className="material-symbols-outlined text-sm text-primary ml-auto">
                                  check
                                </span>
                              )}
                            </button>
                          ))}
                        {/* Customers Section */}
                        {customers.filter((customer) =>
                          (customer.name || customer.email || "")
                            .toLowerCase()
                            .includes(vendorSearch.toLowerCase()),
                        ).length > 0 && (
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b border-t">
                            Customers (for refunds)
                          </div>
                        )}
                        {customers
                          .filter((customer) =>
                            (customer.name || customer.email || "")
                              .toLowerCase()
                              .includes(vendorSearch.toLowerCase()),
                          )
                          .map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  vendorId: customer.id,
                                });
                                setVendorSearch(
                                  customer.name || customer.email || "",
                                );
                                setVendorDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] cursor-pointer flex items-center gap-2"
                            >
                              <span>{customer.name || customer.email}</span>
                              {formData.vendorId === customer.id && (
                                <span className="material-symbols-outlined text-sm text-primary ml-auto">
                                  check
                                </span>
                              )}
                            </button>
                          ))}
                        {vendors.filter((vendor) =>
                          vendor.name
                            .toLowerCase()
                            .includes(vendorSearch.toLowerCase()),
                        ).length === 0 &&
                          customers.filter((customer) =>
                            (customer.name || customer.email || "")
                              .toLowerCase()
                              .includes(vendorSearch.toLowerCase()),
                          ).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              No vendors or customers found
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowVendorForm(true)}
                    className="shrink-0"
                  >
                    <span className="material-symbols-outlined mr-1 text-lg">
                      add
                    </span>
                    Add Vendor
                  </Button>
                </div>
              </div>
            )}

            {formData.direction === "OUTGOING" && (
              <div>
                <Label className="text-sm font-medium">
                  Vehicle {defaultVehicleId ? "(Pre-selected)" : "(Optional)"}
                </Label>
                <Select
                  value={formData.vehicleId || undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vehicleId: value || "" })
                  }
                  disabled={!!defaultVehicleId}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select vehicle (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.vin} - {vehicle.make} {vehicle.model}{" "}
                        {vehicle.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {defaultVehicleId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Vehicle is pre-selected for this transaction
                  </p>
                )}
              </div>
            )}

            {formData.direction === "OUTGOING" && (
              <div>
                <Label className="text-sm font-medium">Invoice Document</Label>
                <div className="mt-1.5 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileChange}
                      className="cursor-pointer flex-1"
                      disabled={uploading}
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={uploading}
                      className="shrink-0"
                      aria-label="Take photo with camera"
                    >
                      <span className="material-symbols-outlined text-lg">
                        camera
                      </span>
                    </Button>
                  </div>
                  {uploading && (
                    <p className="text-sm text-muted-foreground">
                      Uploading...
                    </p>
                  )}
                  {uploadedFileUrl && !uploading && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <span className="material-symbols-outlined text-sm">
                        description
                      </span>
                      <a
                        href={uploadedFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex-1"
                      >
                        View uploaded file
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadedFileUrl(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                          if (cameraInputRef.current)
                            cameraInputRef.current.value = "";
                        }}
                        className="h-6 px-2"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">
                Description (Optional)
              </Label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                placeholder="Transaction description..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5"
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading || uploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || uploading}>
                {loading
                  ? transaction
                    ? "Updating..."
                    : "Creating..."
                  : transaction
                    ? "Update Transaction"
                    : "Create Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {showVendorForm && (
        <VendorForm vendor={null} onClose={handleVendorCreated} />
      )}
    </>
  );
}
