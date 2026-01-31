"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { CustomerForm } from "@/components/CustomerForm";
const invoiceSchema = z
  .object({
    customerId: z.string().min(1, "Customer is required"),
    vehicleId: z.string().optional(), // Required when VEHICLE charge type is selected
    status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "FINALIZED"]),
    issueDate: z.string().min(1, "Issue date is required"),
    dueDate: z.string().optional(),
    taxEnabled: z.boolean().default(false),
    taxRate: z.number().default(10),
    notes: z.string().optional(),
    customerUsesInJapan: z.boolean().default(false),
    charges: z.array(
      z.object({
        chargeType: z.enum([
          "VEHICLE",
          "EXPORT_FEES",
          "SHIPPING",
          "RECYCLE_FEES",
          "DISCOUNT",
          "CUSTOM",
        ]),
        description: z.string().optional(),
        amount: z.string().min(1, "Amount is required"),
      }),
    ),
  })
  .refine(
    (data) => {
      // vehicleId must be provided if there's a VEHICLE charge type
      const hasVehicleCharge = data.charges.some(
        (charge) => charge.chargeType === "VEHICLE",
      );
      if (hasVehicleCharge) {
        return !!data.vehicleId;
      }
      return true;
    },
    {
      message: "Please select a vehicle for the vehicle charge",
      path: ["vehicleId"],
    },
  )
  .refine(
    (data) => {
      // Description is required for non-VEHICLE charges
      return data.charges.every((charge) => {
        if (charge.chargeType === "VEHICLE") {
          return true; // VEHICLE charges get description from vehicle selection
        }
        return charge.description && charge.description.trim().length > 0;
      });
    },
    {
      message: "Description is required",
      path: ["charges"],
    },
  );

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  billingAddress?: any;
  shippingAddress?: any;
}

interface Vehicle {
  id: string;
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
  price: number | null;
}

interface InvoiceFormProps {
  invoice?: any; // Optional invoice for edit mode
}

export function InvoiceForm({ invoice }: InvoiceFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("inquiryId");
  const [saving, setSaving] = useState(false);
  const [loadingInquiry, setLoadingInquiry] = useState(!!inquiryId);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  // Store shipping rates and dimensions per charge index
  const [shippingRates, setShippingRates] = useState<
    Record<
      number,
      {
        ratePerM3: string;
        exchangeRate?: string; // Only used when currency is JPY
        length: string; // cm
        width: string; // cm
        height: string; // cm
      }
    >
  >({});

  // Currency state (USD or JPY)
  const [currency, setCurrency] = useState<"USD" | "JPY">("JPY");
  // Recycle Fee - manual entry
  const [recycleFee, setRecycleFee] = useState<string>("");

  // Helper function to get currency symbol
  const getCurrencySymbol = () => {
    return currency === "USD" ? "$" : "¥";
  };

  // Recalculate shipping amounts when currency changes
  useEffect(() => {
    const currentCharges = watch("charges");
    currentCharges.forEach((charge: any, index: number) => {
      if (charge.chargeType === "SHIPPING") {
        const shippingRate = shippingRates[index];
        if (
          shippingRate?.length &&
          shippingRate?.width &&
          shippingRate?.height &&
          shippingRate?.ratePerM3
        ) {
          const amount = calculateShippingAmount(
            shippingRate.length,
            shippingRate.width,
            shippingRate.height,
            shippingRate.ratePerM3,
            currency === "JPY" ? shippingRate.exchangeRate : undefined,
          );
          if (amount) {
            setValue(`charges.${index}.amount`, amount);
          }
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      status: invoice?.status || "DRAFT",
      charges: [],
      issueDate: invoice?.issueDate
        ? new Date(invoice.issueDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      dueDate: invoice?.dueDate
        ? new Date(invoice.dueDate).toISOString().split("T")[0]
        : "",
      taxEnabled: invoice?.taxEnabled || false,
      taxRate: invoice?.taxRate ? parseFloat(invoice.taxRate.toString()) : 10,
      notes: invoice?.notes || "",
      customerUsesInJapan: invoice?.customerUsesInJapan || false,
      customerId: invoice?.customerId || "",
      vehicleId: invoice?.vehicleId || "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "charges",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (inquiryId && customers.length > 0) {
      fetchInquiryData(inquiryId);
    }
  }, [inquiryId, customers.length]);

  // Load invoice data for editing - ensure customers are loaded first
  useEffect(() => {
    if (invoice && customers.length > 0) {
      // Ensure customerId is set after customers are loaded
      setValue("customerId", invoice.customerId);
      setValue("vehicleId", invoice.vehicleId || "");
      setValue("status", invoice.status);
      setValue(
        "issueDate",
        invoice.issueDate
          ? new Date(invoice.issueDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      );
      setValue(
        "dueDate",
        invoice.dueDate
          ? new Date(invoice.dueDate).toISOString().split("T")[0]
          : "",
      );
      setValue("taxEnabled", invoice.taxEnabled || false);
      setValue(
        "taxRate",
        invoice.taxRate ? parseFloat(invoice.taxRate.toString()) : 10,
      );
      setValue("notes", invoice.notes || "");
      setValue("customerUsesInJapan", invoice.customerUsesInJapan || false);

      // Load charges
      if (invoice.charges && invoice.charges.length > 0) {
        const formattedCharges = invoice.charges.map((charge: any) => {
          // Handle chargeType - it can be an object with name property or a string
          const chargeTypeName =
            charge.chargeType?.name || charge.chargeType || "CUSTOM";
          // Map to enum values
          const chargeTypeEnum = [
            "VEHICLE",
            "EXPORT_FEES",
            "SHIPPING",
            "RECYCLE_FEES",
            "DISCOUNT",
            "CUSTOM",
          ].includes(chargeTypeName)
            ? chargeTypeName
            : "CUSTOM";
          return {
            chargeType: chargeTypeEnum,
            description: charge.description,
            amount: charge.amount
              ? parseFloat(charge.amount.toString()).toLocaleString("en-US")
              : "",
          };
        });
        setValue("charges", formattedCharges);
      }
    }
  }, [invoice, customers.length, setValue]);

  const fetchInquiryData = async (id: string) => {
    try {
      const response = await fetch(`/api/inquiries/${id}`);
      if (response.ok) {
        const inquiry = await response.json();

        // Find or create customer
        let customer = customers.find(
          (c) => c.email === inquiry.email || c.name === inquiry.customerName,
        );

        if (!customer && inquiry.customerName) {
          // Create customer from inquiry
          const customerResponse = await fetch("/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: inquiry.customerName,
              email: inquiry.email || null,
              phone: inquiry.phone || null,
            }),
          });
          if (customerResponse.ok) {
            customer = await customerResponse.json();
            if (customer) {
              setCustomers([...customers, customer]);
              setValue("customerId", customer.id);
            }
          }
        } else if (customer) {
          setValue("customerId", customer.id);
        }

        // Note: Vehicle creation would need VIN from inquiry metadata
        // This is a placeholder - in production, extract VIN from inquiry data
      }
    } catch (error) {
      console.error("Error fetching inquiry data:", error);
    } finally {
      setLoadingInquiry(false);
    }
  };

  useEffect(() => {
    // Fetch all vehicles on mount
    fetchVehicles("");
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchVehicles = async (search: string) => {
    try {
      const response = await fetch(
        `/api/vehicles?search=${encodeURIComponent(search)}`,
      );
      if (response.ok) {
        const data = await response.json();
        // Ensure price is parsed correctly
        const vehiclesWithPrice = data.map((v: any) => ({
          ...v,
          price: v.price ? parseFloat(v.price.toString()) : null,
        }));
        setVehicles(vehiclesWithPrice);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  // Helper function to calculate volume in m³ from dimensions in cm
  const calculateVolumeM3 = (
    length: string,
    width: string,
    height: string,
  ): number | null => {
    const l = parseFloat(length);
    const w = parseFloat(width);
    const h = parseFloat(height);
    if (isNaN(l) || isNaN(w) || isNaN(h) || l <= 0 || w <= 0 || h <= 0) {
      return null;
    }
    // Convert cm³ to m³: divide by 1,000,000
    return (l * w * h) / 1000000;
  };

  // Helper function to calculate shipping amount
  // USD: m³ × rate
  // JPY: m³ × rate × exchangeRate
  const calculateShippingAmount = (
    length: string,
    width: string,
    height: string,
    ratePerM3: string,
    exchangeRate?: string,
  ): string | null => {
    const volume = calculateVolumeM3(length, width, height);
    if (!volume || !ratePerM3) return null;
    const rate = parseFloat(ratePerM3);
    if (isNaN(rate) || rate <= 0) {
      return null;
    }

    let amount = volume * rate;

    // If currency is JPY, multiply by exchange rate
    if (currency === "JPY" && exchangeRate) {
      const exchange = parseFloat(exchangeRate);
      if (isNaN(exchange) || exchange <= 0) {
        return null;
      }
      amount = amount * exchange;
    }

    return Math.round(amount).toLocaleString("en-US");
  };

  const onSubmit = async (data: InvoiceFormData) => {
    setSaving(true);
    try {
      const chargesToSubmit = data.charges
        .map((charge) => ({
          chargeType: charge.chargeType,
          description: charge.description,
          amount: parseFloat(charge.amount.replace(/,/g, "") || "0"),
        }))
        .filter((charge) => charge.amount > 0);

      if (chargesToSubmit.length === 0) {
        alert("At least one charge with a valid amount is required");
        setSaving(false);
        return;
      }

      if (!data.vehicleId) {
        alert("Please select a vehicle");
        setSaving(false);
        return;
      }

      const url = invoice ? `/api/invoices/${invoice.id}` : "/api/invoices";
      const method = invoice ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: data.customerId,
          vehicleId: data.vehicleId,
          status: data.status,
          issueDate: data.issueDate
            ? new Date(data.issueDate).toISOString()
            : new Date().toISOString(),
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
          taxEnabled: data.taxEnabled,
          taxRate: data.taxRate,
          notes: data.notes || null,
          customerUsesInJapan: data.customerUsesInJapan,
          charges: chargesToSubmit,
        }),
      });

      if (response.ok) {
        const updatedInvoice = await response.json();
        router.push(`/dashboard/invoices/${updatedInvoice.id}`);
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      const errorMessage =
        error.message || error.toString() || "Failed to create invoice";
      alert(`Error: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const addCharge = () => {
    append({
      chargeType: "CUSTOM" as const,
      description: "",
      amount: "",
    });
  };

  const addVehicleCharge = (vehicle: Vehicle) => {
    // Check if vehicle charge already exists
    const currentCharges = watch("charges");
    const vehicleChargeExists = currentCharges.some((charge) =>
      charge.description?.toLowerCase().includes(vehicle.vin.toLowerCase()),
    );

    if (!vehicleChargeExists) {
      const vehicleDescription =
        vehicle.make && vehicle.model
          ? `${vehicle.year || ""} ${vehicle.make} ${vehicle.model} - ${vehicle.vin}`.trim()
          : vehicle.vin;
      const formattedPrice = vehicle.price
        ? vehicle.price.toLocaleString("en-US")
        : "";

      append({
        chargeType: "VEHICLE",
        description: vehicleDescription,
        amount: formattedPrice,
      });
    }
  };

  const selectedCustomerId = watch("customerId");
  const selectedVehicleId = watch("vehicleId");
  const charges = watch("charges");

  // Fetch company info for "From" section
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/company")
      .then((res) => res.json())
      .then((data) => setCompanyInfo(data))
      .catch(() => setCompanyInfo(null));
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find((c) => c.id === selectedCustomerId);
      setSelectedCustomer(customer || null);
    } else {
      setSelectedCustomer(null);
    }
  }, [selectedCustomerId, customers]);

  // Calculate totals - separate regular charges from discounts
  const { subtotal: chargesSubtotal, discountTotal } = charges.reduce(
    (acc, charge) => {
      const amount = parseFloat(charge.amount?.replace(/,/g, "") || "0");
      if (charge.chargeType === "DISCOUNT") {
        acc.discountTotal += amount;
      } else {
        acc.subtotal += amount;
      }
      return acc;
    },
    { subtotal: 0, discountTotal: 0 },
  );

  const taxAmount = watch("taxEnabled")
    ? chargesSubtotal * (watch("taxRate") / 100)
    : 0;

  const total =
    chargesSubtotal -
    discountTotal +
    taxAmount +
    parseFloat(recycleFee.replace(/,/g, "") || "0");

  if (loadingInquiry) {
    return (
      <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700 lg:w-full">
        <div className="max-w-6xl mx-auto">
          <div className="p-8 text-center text-muted-foreground">
            Loading inquiry data...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700 lg:w-full">
      <div className="max-w-6xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              INVOICE
            </h2>
            <div className="flex items-center gap-4">
              {/* Currency Selector */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Currency
                </Label>
                <Select
                  value={currency}
                  onValueChange={(value: "USD" | "JPY") => setCurrency(value)}
                >
                  <SelectTrigger className="h-10 w-32 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </Label>
                <Select
                  value={watch("status")}
                  onValueChange={(value) =>
                    setValue(
                      "status",
                      value as
                        | "DRAFT"
                        | "PENDING_APPROVAL"
                        | "APPROVED"
                        | "FINALIZED",
                    )
                  }
                >
                  <SelectTrigger className="h-10 w-48 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PENDING_APPROVAL">
                      Submit for Approval
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Company Logo (Optional - for display only) */}
          {companyInfo?.logo && (
            <div className="mb-6">
              <Label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Company Logo
              </Label>
              <div className="mt-2">
                <img
                  src={companyInfo.logo}
                  alt="Logo"
                  className="h-16 object-contain"
                />
              </div>
            </div>
          )}

          {/* From, Billing, Shipping, and Invoice Details */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {/* From Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                From:
              </h3>
              {companyInfo ? (
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <div className="font-medium">{companyInfo.name}</div>
                  {companyInfo.address && (
                    <div>
                      {[
                        companyInfo.address.street,
                        companyInfo.address.city,
                        companyInfo.address.state,
                        companyInfo.address.zip,
                        companyInfo.address.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                  {companyInfo.phone && <div>Phone: {companyInfo.phone}</div>}
                  {companyInfo.email && <div>Email: {companyInfo.email}</div>}
                  {companyInfo.taxId && <div>Tax ID: {companyInfo.taxId}</div>}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Company info not available
                </div>
              )}
            </div>

            {/* Billing Address Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Bill To: <span className="text-red-500">*</span>
              </h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Select
                    key={`customer-select-${customers.length}-${selectedCustomerId}`}
                    value={selectedCustomerId || ""}
                    onValueChange={(value) =>
                      setValue("customerId", value, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="h-10 w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCustomerForm(true)}
                    className="h-10 px-3 flex-shrink-0"
                    title="Add new customer"
                  >
                    <span className="material-symbols-outlined text-lg">
                      add
                    </span>
                  </Button>
                </div>
                {errors.customerId && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.customerId.message}
                  </p>
                )}
                {selectedCustomer && (
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <div className="font-medium">{selectedCustomer.name}</div>
                    {selectedCustomer.billingAddress && (
                      <>
                        {selectedCustomer.billingAddress.street && (
                          <div>{selectedCustomer.billingAddress.street}</div>
                        )}
                        {selectedCustomer.billingAddress.apartment && (
                          <div>{selectedCustomer.billingAddress.apartment}</div>
                        )}
                        {[
                          selectedCustomer.billingAddress.city,
                          selectedCustomer.billingAddress.state,
                          selectedCustomer.billingAddress.zip,
                        ]
                          .filter(Boolean)
                          .join(", ") && (
                          <div>
                            {[
                              selectedCustomer.billingAddress.city,
                              selectedCustomer.billingAddress.state,
                              selectedCustomer.billingAddress.zip,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        )}
                        {selectedCustomer.billingAddress.country && (
                          <div>{selectedCustomer.billingAddress.country}</div>
                        )}
                      </>
                    )}
                    {selectedCustomer.email && (
                      <div>{selectedCustomer.email}</div>
                    )}
                    {selectedCustomer.phone && (
                      <div>{selectedCustomer.phone}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Address Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Ship To:
              </h3>
              {selectedCustomer ? (
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <div className="font-medium">{selectedCustomer.name}</div>
                  {selectedCustomer.shippingAddress ? (
                    <>
                      {selectedCustomer.shippingAddress.street && (
                        <div>{selectedCustomer.shippingAddress.street}</div>
                      )}
                      {selectedCustomer.shippingAddress.apartment && (
                        <div>{selectedCustomer.shippingAddress.apartment}</div>
                      )}
                      {[
                        selectedCustomer.shippingAddress.city,
                        selectedCustomer.shippingAddress.state,
                        selectedCustomer.shippingAddress.zip,
                      ]
                        .filter(Boolean)
                        .join(", ") && (
                        <div>
                          {[
                            selectedCustomer.shippingAddress.city,
                            selectedCustomer.shippingAddress.state,
                            selectedCustomer.shippingAddress.zip,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}
                      {selectedCustomer.shippingAddress.country && (
                        <div>{selectedCustomer.shippingAddress.country}</div>
                      )}
                    </>
                  ) : selectedCustomer.billingAddress ? (
                    <>
                      {selectedCustomer.billingAddress.street && (
                        <div>{selectedCustomer.billingAddress.street}</div>
                      )}
                      {selectedCustomer.billingAddress.apartment && (
                        <div>{selectedCustomer.billingAddress.apartment}</div>
                      )}
                      {[
                        selectedCustomer.billingAddress.city,
                        selectedCustomer.billingAddress.state,
                        selectedCustomer.billingAddress.zip,
                      ]
                        .filter(Boolean)
                        .join(", ") && (
                        <div>
                          {[
                            selectedCustomer.billingAddress.city,
                            selectedCustomer.billingAddress.state,
                            selectedCustomer.billingAddress.zip,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}
                      {selectedCustomer.billingAddress.country && (
                        <div>{selectedCustomer.billingAddress.country}</div>
                      )}
                    </>
                  ) : null}
                  {selectedCustomer.email && (
                    <div>{selectedCustomer.email}</div>
                  )}
                  {selectedCustomer.phone && (
                    <div>{selectedCustomer.phone}</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Select a customer
                </div>
              )}
            </div>

            {/* Invoice Details (Invoice#, Net, Date) */}
            <div className="space-y-3">
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Invoice#
                </Label>
                <Input
                  type="text"
                  placeholder="Auto-generated"
                  disabled
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800"
                />
              </div>
              <div>
                <Label
                  htmlFor="issueDate"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Issue Date <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  id="issueDate"
                  {...register("issueDate")}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
                {errors.issueDate && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.issueDate.message}
                  </p>
                )}
              </div>
              <div>
                <Label
                  htmlFor="dueDate"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Due Date
                </Label>
                <DatePicker
                  id="dueDate"
                  {...register("dueDate")}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left text-sm font-semibold text-gray-900 dark:text-white px-4 py-3">
                      Item Name
                    </th>
                    <th className="text-center text-sm font-semibold text-gray-900 dark:text-white px-4 py-3 w-24">
                      QTY
                    </th>
                    <th className="text-right text-sm font-semibold text-gray-900 dark:text-white px-4 py-3 w-32">
                      Price
                    </th>
                    <th className="text-right text-sm font-semibold text-gray-900 dark:text-white px-4 py-3 w-32">
                      Amount
                    </th>
                    <th className="w-12 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No items added yet. Click &quot;Add new item&quot; to
                        get started.
                      </td>
                    </tr>
                  ) : (
                    fields.map((field, index) => {
                      const amount = parseFloat(
                        watch(`charges.${index}.amount`)?.replace(/,/g, "") ||
                          "0",
                      );
                      return (
                        <tr
                          key={field.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex gap-3 items-start">
                              <Select
                                value={
                                  watch(`charges.${index}.chargeType`) ||
                                  "CUSTOM"
                                }
                                onValueChange={(value) => {
                                  const chargeTypeValue = value as
                                    | "VEHICLE"
                                    | "EXPORT_FEES"
                                    | "SHIPPING"
                                    | "RECYCLE_FEES"
                                    | "DISCOUNT"
                                    | "CUSTOM";

                                  // Set charge type first
                                  setValue(
                                    `charges.${index}.chargeType`,
                                    chargeTypeValue,
                                    {
                                      shouldValidate: false,
                                      shouldDirty: true,
                                    },
                                  );

                                  // Handle description based on charge type
                                  if (value === "EXPORT_FEES") {
                                    setValue(
                                      `charges.${index}.description`,
                                      "Export Fees",
                                      {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                      },
                                    );
                                  } else if (value === "SHIPPING") {
                                    setValue(
                                      `charges.${index}.description`,
                                      "Shipping",
                                      {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                      },
                                    );
                                  } else if (value === "RECYCLE_FEES") {
                                    setValue(
                                      `charges.${index}.description`,
                                      "Recycle Fee",
                                      {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                      },
                                    );
                                  } else if (value === "DISCOUNT") {
                                    setValue(
                                      `charges.${index}.description`,
                                      "Discount",
                                      {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                      },
                                    );
                                  } else if (value === "VEHICLE") {
                                    // For VEHICLE type, set a placeholder description
                                    // It will be updated when vehicle is selected
                                    const vehicleId = watch("vehicleId");
                                    if (vehicleId) {
                                      const selectedVehicle = vehicles.find(
                                        (v) => v.id === vehicleId,
                                      );
                                      if (selectedVehicle) {
                                        const vehicleDescription =
                                          selectedVehicle.make &&
                                          selectedVehicle.model
                                            ? `${selectedVehicle.year || ""} ${selectedVehicle.make} ${selectedVehicle.model} - ${selectedVehicle.vin}`.trim()
                                            : selectedVehicle.vin;
                                        setValue(
                                          `charges.${index}.description`,
                                          vehicleDescription,
                                          {
                                            shouldValidate: true,
                                            shouldDirty: true,
                                          },
                                        );
                                      } else {
                                        // Set placeholder to avoid validation error
                                        setValue(
                                          `charges.${index}.description`,
                                          "Vehicle",
                                          {
                                            shouldValidate: false,
                                            shouldDirty: true,
                                          },
                                        );
                                      }
                                    } else {
                                      // Set placeholder to avoid validation error
                                      setValue(
                                        `charges.${index}.description`,
                                        "Vehicle",
                                        {
                                          shouldValidate: false,
                                          shouldDirty: true,
                                        },
                                      );
                                    }
                                  } else if (value === "CUSTOM") {
                                    // For CUSTOM, clear description if it was auto-set
                                    const currentDesc = watch(
                                      `charges.${index}.description`,
                                    );
                                    if (
                                      currentDesc === "Export Fees" ||
                                      currentDesc === "Shipping" ||
                                      currentDesc === "Recycle Fee" ||
                                      currentDesc === "Discount" ||
                                      currentDesc === "Vehicle"
                                    ) {
                                      setValue(
                                        `charges.${index}.description`,
                                        "",
                                        {
                                          shouldValidate: false,
                                          shouldDirty: true,
                                        },
                                      );
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger className="h-9 w-36 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm font-medium bg-white dark:bg-gray-800">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="VEHICLE">
                                    Vehicle
                                  </SelectItem>
                                  <SelectItem value="EXPORT_FEES">
                                    Export Fees
                                  </SelectItem>
                                  <SelectItem value="SHIPPING">
                                    Shipping
                                  </SelectItem>
                                  <SelectItem value="RECYCLE_FEES">
                                    Recycle Fee
                                  </SelectItem>
                                  <SelectItem value="DISCOUNT">
                                    Discount
                                  </SelectItem>
                                  <SelectItem value="CUSTOM">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                              {watch(`charges.${index}.chargeType`) ===
                              "VEHICLE" ? (
                                <div className="flex gap-2 items-start flex-1">
                                  <Select
                                    key={`vehicle-select-${vehicles.length}-${watch("vehicleId")}`}
                                    value={watch("vehicleId") || ""}
                                    onValueChange={(value) => {
                                      setValue("vehicleId", value, {
                                        shouldValidate: true,
                                      });
                                      const selectedVehicle = vehicles.find(
                                        (v) => v.id === value,
                                      );
                                      if (selectedVehicle) {
                                        const vehicleDescription =
                                          selectedVehicle.make &&
                                          selectedVehicle.model
                                            ? `${selectedVehicle.year || ""} ${selectedVehicle.make} ${selectedVehicle.model} - ${selectedVehicle.vin}`.trim()
                                            : selectedVehicle.vin;
                                        const formattedPrice =
                                          selectedVehicle.price
                                            ? selectedVehicle.price.toLocaleString(
                                                "en-US",
                                              )
                                            : "";
                                        setValue(
                                          `charges.${index}.description`,
                                          vehicleDescription,
                                        );
                                        setValue(
                                          `charges.${index}.amount`,
                                          formattedPrice,
                                        );
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-9 flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400">
                                      <SelectValue placeholder="Select vehicle" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                      {vehicles.map((vehicle) => {
                                        // Short display for trigger (year, make, model only - no VIN)
                                        const shortDisplay =
                                          vehicle.make && vehicle.model
                                            ? `${vehicle.year || ""} ${vehicle.make} ${vehicle.model}`.trim()
                                            : vehicle.vin;
                                        return (
                                          <SelectItem
                                            key={vehicle.id}
                                            value={vehicle.id}
                                          >
                                            <div className="flex flex-col">
                                              <span className="font-medium">
                                                {shortDisplay}
                                              </span>
                                              {vehicle.make &&
                                                vehicle.model && (
                                                  <span className="text-xs text-muted-foreground mt-0.5">
                                                    VIN: {vehicle.vin}
                                                  </span>
                                                )}
                                            </div>
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowVehicleForm(true)}
                                    className="h-9 px-3 flex-shrink-0"
                                    title="Add new vehicle"
                                  >
                                    <span className="material-symbols-outlined text-lg">
                                      add
                                    </span>
                                  </Button>
                                </div>
                              ) : watch(`charges.${index}.chargeType`) ===
                                "SHIPPING" ? (
                                <div className="flex-1 space-y-2">
                                  <Input
                                    placeholder="Enter item name or description"
                                    {...register(
                                      `charges.${index}.description`,
                                    )}
                                    className="h-9 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                                  />
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-3 gap-2">
                                      <div>
                                        <Label className="text-xs">
                                          Length (cm)
                                        </Label>
                                        <Input
                                          type="text"
                                          placeholder="0"
                                          value={
                                            shippingRates[index]?.length || ""
                                          }
                                          onChange={(e) => {
                                            const value =
                                              e.target.value.replace(
                                                /[^\d.]/g,
                                                "",
                                              );
                                            setShippingRates((prev) => ({
                                              ...prev,
                                              [index]: {
                                                ...prev[index],
                                                length: value,
                                                width: prev[index]?.width || "",
                                                height:
                                                  prev[index]?.height || "",
                                                ratePerM3:
                                                  prev[index]?.ratePerM3 || "",
                                                exchangeRate:
                                                  prev[index]?.exchangeRate ||
                                                  "",
                                              },
                                            }));
                                            // Calculate shipping amount
                                            if (
                                              value &&
                                              shippingRates[index]?.width &&
                                              shippingRates[index]?.height &&
                                              shippingRates[index]?.ratePerM3
                                            ) {
                                              const amount =
                                                calculateShippingAmount(
                                                  value,
                                                  shippingRates[index].width,
                                                  shippingRates[index].height,
                                                  shippingRates[index]
                                                    .ratePerM3,
                                                  currency === "JPY"
                                                    ? shippingRates[index]
                                                        ?.exchangeRate
                                                    : undefined,
                                                );
                                              if (amount) {
                                                setValue(
                                                  `charges.${index}.amount`,
                                                  amount,
                                                );
                                              }
                                            }
                                          }}
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">
                                          Width (cm)
                                        </Label>
                                        <Input
                                          type="text"
                                          placeholder="0"
                                          value={
                                            shippingRates[index]?.width || ""
                                          }
                                          onChange={(e) => {
                                            const value =
                                              e.target.value.replace(
                                                /[^\d.]/g,
                                                "",
                                              );
                                            setShippingRates((prev) => ({
                                              ...prev,
                                              [index]: {
                                                ...prev[index],
                                                width: value,
                                                length:
                                                  prev[index]?.length || "",
                                                height:
                                                  prev[index]?.height || "",
                                                ratePerM3:
                                                  prev[index]?.ratePerM3 || "",
                                                exchangeRate:
                                                  prev[index]?.exchangeRate ||
                                                  "",
                                              },
                                            }));
                                            // Calculate shipping amount
                                            if (
                                              shippingRates[index]?.length &&
                                              value &&
                                              shippingRates[index]?.height &&
                                              shippingRates[index]?.ratePerM3
                                            ) {
                                              const amount =
                                                calculateShippingAmount(
                                                  shippingRates[index].length,
                                                  value,
                                                  shippingRates[index].height,
                                                  shippingRates[index]
                                                    .ratePerM3,
                                                  currency === "JPY"
                                                    ? shippingRates[index]
                                                        ?.exchangeRate
                                                    : undefined,
                                                );
                                              if (amount) {
                                                setValue(
                                                  `charges.${index}.amount`,
                                                  amount,
                                                );
                                              }
                                            }
                                          }}
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">
                                          Height (cm)
                                        </Label>
                                        <Input
                                          type="text"
                                          placeholder="0"
                                          value={
                                            shippingRates[index]?.height || ""
                                          }
                                          onChange={(e) => {
                                            const value =
                                              e.target.value.replace(
                                                /[^\d.]/g,
                                                "",
                                              );
                                            setShippingRates((prev) => ({
                                              ...prev,
                                              [index]: {
                                                ...prev[index],
                                                height: value,
                                                length:
                                                  prev[index]?.length || "",
                                                width: prev[index]?.width || "",
                                                ratePerM3:
                                                  prev[index]?.ratePerM3 || "",
                                                exchangeRate:
                                                  prev[index]?.exchangeRate ||
                                                  "",
                                              },
                                            }));
                                            // Calculate shipping amount
                                            if (
                                              shippingRates[index]?.length &&
                                              shippingRates[index]?.width &&
                                              value &&
                                              shippingRates[index]?.ratePerM3
                                            ) {
                                              const amount =
                                                calculateShippingAmount(
                                                  shippingRates[index].length,
                                                  shippingRates[index].width,
                                                  value,
                                                  shippingRates[index]
                                                    .ratePerM3,
                                                  currency === "JPY"
                                                    ? shippingRates[index]
                                                        ?.exchangeRate
                                                    : undefined,
                                                );
                                              if (amount) {
                                                setValue(
                                                  `charges.${index}.amount`,
                                                  amount,
                                                );
                                              }
                                            }
                                          }}
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                    </div>
                                    {shippingRates[index]?.length &&
                                    shippingRates[index]?.width &&
                                    shippingRates[index]?.height ? (
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        Volume:{" "}
                                        {calculateVolumeM3(
                                          shippingRates[index].length,
                                          shippingRates[index].width,
                                          shippingRates[index].height,
                                        )?.toFixed(4) || "0"}{" "}
                                        m³
                                      </div>
                                    ) : null}
                                    <div
                                      className={`grid gap-2 ${currency === "JPY" ? "grid-cols-2" : "grid-cols-1"}`}
                                    >
                                      <div>
                                        <Label className="text-xs">
                                          Rate (USD/m³)
                                        </Label>
                                        <Input
                                          type="text"
                                          placeholder="0"
                                          value={
                                            shippingRates[index]?.ratePerM3 ||
                                            ""
                                          }
                                          onChange={(e) => {
                                            const value =
                                              e.target.value.replace(
                                                /[^\d.]/g,
                                                "",
                                              );
                                            setShippingRates((prev) => ({
                                              ...prev,
                                              [index]: {
                                                ...prev[index],
                                                ratePerM3: value,
                                                length:
                                                  prev[index]?.length || "",
                                                width: prev[index]?.width || "",
                                                height:
                                                  prev[index]?.height || "",
                                                exchangeRate:
                                                  prev[index]?.exchangeRate ||
                                                  "",
                                              },
                                            }));
                                            // Calculate shipping amount
                                            if (
                                              shippingRates[index]?.length &&
                                              shippingRates[index]?.width &&
                                              shippingRates[index]?.height &&
                                              value
                                            ) {
                                              const amount =
                                                calculateShippingAmount(
                                                  shippingRates[index].length,
                                                  shippingRates[index].width,
                                                  shippingRates[index].height,
                                                  value,
                                                  currency === "JPY"
                                                    ? shippingRates[index]
                                                        ?.exchangeRate
                                                    : undefined,
                                                );
                                              if (amount) {
                                                setValue(
                                                  `charges.${index}.amount`,
                                                  amount,
                                                );
                                              }
                                            }
                                          }}
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                      {currency === "JPY" && (
                                        <div>
                                          <Label className="text-xs">
                                            Exchange Rate (USD→JPY)
                                          </Label>
                                          <Input
                                            type="text"
                                            placeholder="0"
                                            value={
                                              shippingRates[index]
                                                ?.exchangeRate || ""
                                            }
                                            onChange={(e) => {
                                              const value =
                                                e.target.value.replace(
                                                  /[^\d.]/g,
                                                  "",
                                                );
                                              setShippingRates((prev) => ({
                                                ...prev,
                                                [index]: {
                                                  ...prev[index],
                                                  exchangeRate: value,
                                                  length:
                                                    prev[index]?.length || "",
                                                  width:
                                                    prev[index]?.width || "",
                                                  height:
                                                    prev[index]?.height || "",
                                                  ratePerM3:
                                                    prev[index]?.ratePerM3 ||
                                                    "",
                                                },
                                              }));
                                              // Calculate shipping amount
                                              if (
                                                shippingRates[index]?.length &&
                                                shippingRates[index]?.width &&
                                                shippingRates[index]?.height &&
                                                shippingRates[index]
                                                  ?.ratePerM3 &&
                                                value
                                              ) {
                                                const amount =
                                                  calculateShippingAmount(
                                                    shippingRates[index].length,
                                                    shippingRates[index].width,
                                                    shippingRates[index].height,
                                                    shippingRates[index]
                                                      .ratePerM3,
                                                    value,
                                                  );
                                                if (amount) {
                                                  setValue(
                                                    `charges.${index}.amount`,
                                                    amount,
                                                  );
                                                }
                                              }
                                            }}
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <Input
                                  placeholder="Enter item name or description (e.g., 'CIF Vehicle Price')"
                                  {...register(`charges.${index}.description`)}
                                  className="flex-1 h-9 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                                />
                              )}
                            </div>
                            {errors.charges?.[index]?.description && (
                              <p className="text-xs text-red-500 mt-1.5 px-1">
                                {errors.charges[index]?.description?.message}
                              </p>
                            )}
                            {watch(`charges.${index}.chargeType`) ===
                              "VEHICLE" &&
                              errors.vehicleId && (
                                <p className="text-xs text-red-500 mt-1.5 px-1">
                                  {errors.vehicleId.message}
                                </p>
                              )}
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min="1"
                              value="1"
                              disabled
                              className="w-full h-9 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-center bg-gray-50 dark:bg-gray-800/50"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600 dark:text-gray-400">
                                {getCurrencySymbol()}
                              </span>
                              <Input
                                type="text"
                                placeholder="0"
                                {...register(`charges.${index}.amount`)}
                                className="w-full h-9 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 pl-8 text-sm text-right bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                                onChange={(e) => {
                                  const value = e.target.value.replace(
                                    /[^\d]/g,
                                    "",
                                  );
                                  if (value === "") {
                                    setValue(`charges.${index}.amount`, "");
                                  } else {
                                    const formatted = parseInt(
                                      value,
                                      10,
                                    ).toLocaleString("en-US");
                                    setValue(
                                      `charges.${index}.amount`,
                                      formatted,
                                    );
                                  }
                                }}
                              />
                            </div>
                            {errors.charges?.[index]?.amount && (
                              <p className="text-xs text-red-500 mt-1.5 px-1">
                                {errors.charges[index]?.amount?.message}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`text-sm font-semibold ${
                                watch(`charges.${index}.chargeType`) ===
                                "DISCOUNT"
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-gray-900 dark:text-white"
                              }`}
                            >
                              {watch(`charges.${index}.chargeType`) ===
                              "DISCOUNT"
                                ? "-"
                                : ""}
                              {getCurrencySymbol()}
                              {amount.toLocaleString("en-US")}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="h-8 w-8 p-0 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                              title="Remove item"
                            >
                              <span className="material-symbols-outlined text-lg">
                                delete
                              </span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <Button
                type="button"
                variant="outline"
                onClick={addCharge}
                className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Add new item
              </Button>
            </div>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mb-6">
            <div className="w-80">
              <div className="flex justify-between py-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Subtotal
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {getCurrencySymbol()}
                  {chargesSubtotal.toLocaleString("en-US")}
                </span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Discount
                  </span>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    -{getCurrencySymbol()}
                    {discountTotal.toLocaleString("en-US")}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="taxEnabled"
                    checked={watch("taxEnabled")}
                    onCheckedChange={(checked) => {
                      const enabled = checked === true;
                      setValue("taxEnabled", enabled);
                      setValue("customerUsesInJapan", enabled);
                      setValue("taxRate", 10);
                    }}
                  />
                  <Label
                    htmlFor="taxEnabled"
                    className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    Japanese Consumption Tax (10%)
                  </Label>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {getCurrencySymbol()}
                  {taxAmount.toLocaleString("en-US")}
                </span>
              </div>
              {/* Recycle Fee - manual entry when tax is enabled */}
              {watch("taxEnabled") && (
                <div className="flex items-center justify-between py-2">
                  <Label className="text-sm text-gray-700 dark:text-gray-300">
                    Recycle Fee
                  </Label>
                  <div className="relative w-32">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600 dark:text-gray-400">
                      {getCurrencySymbol()}
                    </span>
                    <Input
                      type="text"
                      value={recycleFee}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, "");
                        if (value === "") {
                          setRecycleFee("");
                        } else {
                          const formatted = parseInt(value, 10).toLocaleString(
                            "en-US",
                          );
                          setRecycleFee(formatted);
                        }
                      }}
                      placeholder="0"
                      className="h-8 pl-6 text-sm text-right border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-between py-3 border-t-2 border-gray-300 dark:border-gray-600">
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  TOTAL
                </span>
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  {getCurrencySymbol()}
                  {total.toLocaleString("en-US")}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label
              htmlFor="notes"
              className="block text-sm font-semibold text-gray-900 dark:text-white mb-2"
            >
              Notes
            </Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="It was a pleasure doing business with you."
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="h-10 px-6"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="h-10 px-6">
                {saving
                  ? invoice
                    ? "Updating..."
                    : "Creating..."
                  : invoice
                    ? "Update Invoice"
                    : "Create Invoice"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {showCustomerForm && (
        <CustomerForm
          customer={null}
          onClose={() => {
            setShowCustomerForm(false);
          }}
          onCustomerCreated={async (createdCustomer) => {
            // Refresh customers list first
            await fetchCustomers();
            // Then select the newly created customer
            setValue("customerId", createdCustomer.id, {
              shouldValidate: true,
            });
            setShowCustomerForm(false);
          }}
        />
      )}

      {showVehicleForm && (
        <VehicleForm
          onClose={() => {
            setShowVehicleForm(false);
            fetchVehicles(""); // Refresh all vehicles
          }}
          onVehicleCreated={async (vehicle) => {
            // Refresh vehicles list first to ensure new vehicle is available
            await fetchVehicles("");

            // Set the vehicle ID after refresh
            setValue("vehicleId", vehicle.id, { shouldValidate: true });

            // Check if there's already a VEHICLE charge type that needs updating
            const currentCharges = watch("charges");
            const vehicleChargeIndex = currentCharges.findIndex(
              (charge) => charge.chargeType === "VEHICLE",
            );

            if (vehicleChargeIndex !== -1) {
              // Update existing VEHICLE charge instead of adding a new one
              const vehicleDescription =
                vehicle.make && vehicle.model
                  ? `${vehicle.year || ""} ${vehicle.make} ${vehicle.model} - ${vehicle.vin}`.trim()
                  : vehicle.vin;
              const formattedPrice = vehicle.price
                ? vehicle.price.toLocaleString("en-US")
                : "";
              setValue(
                `charges.${vehicleChargeIndex}.description`,
                vehicleDescription,
              );
              setValue(`charges.${vehicleChargeIndex}.amount`, formattedPrice);
            } else if (vehicle.price) {
              // Only add a new charge if there isn't already a VEHICLE charge type
              addVehicleCharge(vehicle);
            }

            setShowVehicleForm(false);
          }}
        />
      )}
    </div>
  );
}

// Simple vehicle form component
function VehicleForm({
  onClose,
  onVehicleCreated,
}: {
  onClose: () => void;
  onVehicleCreated?: (vehicle: Vehicle) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [vin, setVin] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [companiesByCountry, setCompaniesByCountry] = useState<
    {
      country: string;
      companies: { company_id: number; name: string; country: string }[];
    }[]
  >([]);
  const [models, setModels] = useState<
    { model_id: number; name: string; company_ref: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehicleData();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadModelsForCompany(parseInt(selectedCompanyId, 10));
      setModel(""); // Reset model when company changes
    } else {
      setModels([]);
      setModel("");
    }
  }, [selectedCompanyId]);

  const loadVehicleData = async () => {
    try {
      // Load companies
      const companiesRes = await fetch("/api/vehicles/lookup?type=companies");
      const companiesData = await companiesRes.json();
      const companiesMap = new Map<
        string,
        { company_id: number; name: string; country: string }[]
      >();

      // Group companies by country
      for (const company of companiesData) {
        const country = company.country || "OTHER";
        if (!companiesMap.has(country)) {
          companiesMap.set(country, []);
        }
        companiesMap.get(country)!.push(company);
      }

      // Sort companies within each country
      for (const [country, companyList] of companiesMap.entries()) {
        companyList.sort((a, b) => a.name.localeCompare(b.name));
      }

      // Get countries, Japan first
      const allCountries = Array.from(companiesMap.keys());
      const japanIndex = allCountries.indexOf("JAPAN");
      if (japanIndex > -1) {
        allCountries.splice(japanIndex, 1);
        allCountries.sort();
        allCountries.unshift("JAPAN");
      } else {
        allCountries.sort();
      }

      const grouped = allCountries.map((country) => ({
        country,
        companies: companiesMap.get(country)!,
      }));

      setCompaniesByCountry(grouped);
    } catch (error) {
      console.error("Error loading companies:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadModelsForCompany = async (companyId: number) => {
    try {
      const modelsRes = await fetch("/api/vehicles/lookup?type=models");
      const modelsData = await modelsRes.json();

      const filteredModels = modelsData
        .filter((m: any) => m.company_ref === companyId)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      setModels(filteredModels);
    } catch (error) {
      console.error("Error loading models:", error);
    }
  };

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    const company = companiesByCountry
      .flatMap((g) => g.companies)
      .find((c) => c.company_id.toString() === companyId);
    setMake(company ? company.name : "");
  };

  const handleModelChange = (modelId: string) => {
    const selectedModel = models.find((m) => m.model_id.toString() === modelId);
    if (selectedModel) {
      setModel(selectedModel.name);
    } else {
      setModel("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Remove commas from price before sending
      const priceValue = price ? parseFloat(price.replace(/,/g, "")) : null;

      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vin,
          make: make || null,
          model: model || null,
          year: year ? parseInt(year) : null,
          price: priceValue,
        }),
      });
      if (response.ok) {
        const createdVehicle = await response.json();
        // Call callback with created vehicle if provided
        if (onVehicleCreated) {
          onVehicleCreated({
            id: createdVehicle.id,
            vin: createdVehicle.vin,
            make: createdVehicle.make,
            model: createdVehicle.model,
            year: createdVehicle.year,
            price: createdVehicle.price
              ? parseFloat(createdVehicle.price.toString())
              : null,
          });
        }
        onClose();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert("Failed to create vehicle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Add Vehicle</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>VIN *</Label>
              <Input
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Make</Label>
                {loading ? (
                  <Input placeholder="Loading..." disabled />
                ) : (
                  <Select
                    value={selectedCompanyId}
                    onValueChange={handleCompanyChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select make" />
                    </SelectTrigger>
                    <SelectContent>
                      {companiesByCountry.map((group) => (
                        <SelectGroup key={group.country}>
                          <SelectLabel>{group.country}</SelectLabel>
                          {group.companies.map((company) => (
                            <SelectItem
                              key={company.company_id}
                              value={company.company_id.toString()}
                            >
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label>Model</Label>
                <Select
                  value={
                    models.find((m) => m.name === model)?.model_id.toString() ||
                    ""
                  }
                  onValueChange={handleModelChange}
                  disabled={!selectedCompanyId || models.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        selectedCompanyId
                          ? models.length === 0
                            ? "No models found"
                            : "Select model"
                          : "Select make first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {models.length === 0 && selectedCompanyId ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No models found for this make
                      </div>
                    ) : (
                      models.map((m) => (
                        <SelectItem
                          key={m.model_id}
                          value={m.model_id.toString()}
                        >
                          {m.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Year</Label>
                <Select value={year} onValueChange={(value) => setYear(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 2026 - 1989 + 1 }, (_, i) => {
                      const yearValue = 2026 - i;
                      return (
                        <SelectItem
                          key={yearValue}
                          value={yearValue.toString()}
                        >
                          {yearValue}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Price (JPY)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ¥
                  </span>
                  <Input
                    className="pl-8"
                    value={price}
                    onChange={(e) => {
                      // Remove all non-digit characters
                      const numericValue = e.target.value.replace(/[^\d]/g, "");
                      // Format with commas
                      if (numericValue === "") {
                        setPrice("");
                      } else {
                        const formatted = parseInt(
                          numericValue,
                          10,
                        ).toLocaleString("en-US");
                        setPrice(formatted);
                      }
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
