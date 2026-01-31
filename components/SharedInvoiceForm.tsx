"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VendorForm } from "@/components/VendorForm";
const sharedInvoiceSchema = z.object({
  type: z.string().min(1, "Type is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  date: z.string().optional(), // Payment date is now optional
  paymentDeadline: z.string().min(1, "Payment deadline is required"), // New required deadline field
  vehicleIds: z.array(z.string()).min(1, "At least one vehicle is required"),
  costItems: z
    .array(
      z.object({
        description: z.string().min(1, "Description is required"),
        amount: z.string().min(1, "Amount is required"),
      }),
    )
    .min(1, "At least one cost item is required"),
});

type SharedInvoiceFormData = z.infer<typeof sharedInvoiceSchema>;

interface Vehicle {
  id: string;
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
}

interface Vendor {
  id: string;
  name: string;
}

interface SharedInvoiceFormProps {
  invoice?: {
    id: string;
    type: string;
    totalAmount: number;
    date: string;
    vehicles: Array<{
      vehicleId: string;
    }>;
  } | null;
  onClose: () => void;
}

export function SharedInvoiceForm({
  invoice,
  onClose,
}: SharedInvoiceFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState("");
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]);
  const [hasModifiedCostItems, setHasModifiedCostItems] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [editingCostItemIndex, setEditingCostItemIndex] = useState<
    number | null
  >(null);

  const initialType = invoice?.type || "FORWARDER";
  const getDefaultCostItems = (invoiceType: string) => {
    if (invoice) {
      // When editing, try to preserve existing items or split totalAmount
      if (invoiceType === "CONTAINER") {
        return [
          {
            description: "Ocean Freight",
            amount: (invoice.totalAmount / 2).toString(),
          },
          {
            description: "Vanning",
            amount: (invoice.totalAmount / 2).toString(),
          },
        ];
      } else if (invoiceType === "FORWARDER") {
        return [
          {
            description: "Forwarding",
            amount: invoice.totalAmount.toString(),
          },
        ];
      } else {
        // For custom types, return empty array or single item
        return [{ description: "", amount: "" }];
      }
    } else {
      // When creating new, use defaults based on type
      if (invoiceType === "CONTAINER") {
        return [
          { description: "Ocean Freight", amount: "" },
          { description: "Vanning", amount: "" },
        ];
      } else if (invoiceType === "FORWARDER") {
        return [{ description: "Forwarding", amount: "" }];
      } else {
        // For custom types, return empty array
        return [{ description: "", amount: "" }];
      }
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<SharedInvoiceFormData>({
    resolver: zodResolver(sharedInvoiceSchema),
    defaultValues: {
      type: initialType,
      vendorId: "",
      date: invoice?.date
        ? new Date(invoice.date).toISOString().split("T")[0]
        : "",
      paymentDeadline: invoice?.paymentDeadline
        ? new Date(invoice.paymentDeadline).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      vehicleIds: invoice?.vehicles.map((v) => v.vehicleId) || [],
      costItems: getDefaultCostItems(initialType),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "costItems",
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (search) {
      const timeout = setTimeout(() => {
        fetchVehicles(search);
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setVehicles([]);
    }
  }, [search]);

  useEffect(() => {
    if (invoice) {
      // Fetch shared invoice details
      fetch(`/api/shared-invoices/${invoice.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.vehicles) {
            const vehicles = data.vehicles.map((v: any) => v.vehicle);
            setSelectedVehicles(vehicles);
            setValue(
              "vehicleIds",
              vehicles.map((v: Vehicle) => v.id),
            );
            setValue("type", data.type);
            setValue("date", data.date ? new Date(data.date).toISOString().split("T")[0] : "");
            setValue("paymentDeadline", data.paymentDeadline ? new Date(data.paymentDeadline).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
            // Restore vendor from metadata if available
            if (data.metadata?.vendorId) {
              setValue("vendorId", data.metadata.vendorId);
            }
            // Restore cost items from metadata if available
            if (
              data.metadata?.costItems &&
              Array.isArray(data.metadata.costItems)
            ) {
              const restoredItems = data.metadata.costItems.map(
                (item: any) => ({
                  description: item.description || "",
                  amount: item.amount
                    ? parseFloat(item.amount.toString()).toLocaleString("en-US")
                    : "",
                }),
              );
              setValue("costItems", restoredItems);
              setHasModifiedCostItems(true);
            }
          }
        });
    }
  }, [invoice, setValue]);

  const fetchVendors = async () => {
    try {
      const response = await fetch("/api/vendors");
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  const fetchVehicles = async (searchTerm: string) => {
    try {
      const response = await fetch(
        `/api/vehicles?search=${encodeURIComponent(searchTerm)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setVehicles(
          data.filter(
            (v: Vehicle) => !selectedVehicles.find((sv) => sv.id === v.id),
          ),
        );
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const addVehicle = (vehicle: Vehicle) => {
    if (!selectedVehicles.find((v) => v.id === vehicle.id)) {
      const updated = [...selectedVehicles, vehicle];
      setSelectedVehicles(updated);
      setValue(
        "vehicleIds",
        updated.map((v) => v.id),
      );
      setSearch("");
      setVehicles([]);
    }
  };

  const removeVehicle = (vehicleId: string) => {
    const updated = selectedVehicles.filter((v) => v.id !== vehicleId);
    setSelectedVehicles(updated);
    setValue(
      "vehicleIds",
      updated.map((v) => v.id),
    );
  };

  const onSubmit = async (data: SharedInvoiceFormData) => {
    setSaving(true);
    try {
      // Calculate total from all cost items
      const totalAmount = data.costItems.reduce((sum, item) => {
        const amount = parseFloat((item.amount || "").replace(/,/g, "") || "0");
        return sum + amount;
      }, 0);

      if (totalAmount <= 0) {
        alert("Total amount must be greater than 0");
        setSaving(false);
        return;
      }

      const url = invoice ? "/api/shared-invoices" : "/api/shared-invoices";
      const method = invoice ? "PATCH" : "POST";

      const body = invoice
        ? {
            id: invoice.id,
            type: data.type,
            vendorId: data.vendorId || null,
            totalAmount: totalAmount,
            date: data.date || null,
            paymentDeadline: data.paymentDeadline,
            vehicleIds: data.vehicleIds,
            costItems: data.costItems.map((item) => ({
              description: item.description,
              amount: item.amount.replace(/,/g, ""),
            })),
          }
        : {
            type: data.type,
            vendorId: data.vendorId || null,
            totalAmount: totalAmount,
            date: data.date || null,
            paymentDeadline: data.paymentDeadline,
            vehicleIds: data.vehicleIds,
            costItems: data.costItems.map((item) => ({
              description: item.description,
              amount: item.amount.replace(/,/g, ""),
            })),
          };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        onClose();
        router.refresh(); // Refresh to show the updated invoice
      } else {
        let errorMessage = "Unknown error";
        try {
          const error = await response.json();
          errorMessage = error.details
            ? `${error.error}: ${error.details}`
            : error.error || "Unknown error";
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        console.error("Error saving shared invoice:", errorMessage);
        alert(`Error: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error("Error saving shared invoice:", error);
      alert(`Failed to save shared invoice: ${error.message || String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const vehicleDisplay = (vehicle: Vehicle) => {
    if (vehicle.make && vehicle.model) {
      return `${vehicle.year || ""} ${vehicle.make} ${vehicle.model} - ${vehicle.vin}`.trim();
    }
    return vehicle.vin;
  };

  const type = watch("type");
  const costItems = watch("costItems");

  // Update cost items when type changes (only for new invoices and if not manually modified)
  useEffect(() => {
    if (!invoice && !hasModifiedCostItems) {
      if (type === "CONTAINER") {
        // Check if we need to switch to container defaults
        const hasContainerDefaults =
          costItems.length === 2 &&
          costItems.some((item) => item.description === "Ocean Freight") &&
          costItems.some((item) => item.description === "Vanning");

        if (!hasContainerDefaults) {
          setValue("costItems", [
            { description: "Ocean Freight", amount: "" },
            { description: "Vanning", amount: "" },
          ]);
        }
      } else if (type === "FORWARDER") {
        // Check if we need to switch to forwarder defaults
        const hasForwarderDefault =
          costItems.length === 1 && costItems[0]?.description === "Forwarding";

        if (!hasForwarderDefault) {
          setValue("costItems", [{ description: "Forwarding", amount: "" }]);
        }
      }
    }
  }, [type, invoice, costItems, setValue, hasModifiedCostItems]);

  // Calculate total from all cost items
  const totalAmount = costItems.reduce((sum, item) => {
    const amount = parseFloat((item.amount || "").replace(/,/g, "") || "0");
    return sum + amount;
  }, 0);

  const allocatedAmount =
    selectedVehicles.length > 0 && totalAmount > 0
      ? totalAmount / selectedVehicles.length
      : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader>
          <CardTitle>
            {invoice ? "Edit Shared Invoice" : "New Shared Invoice"}
          </CardTitle>
          <CardDescription>
            {invoice
              ? "Update shared invoice information"
              : "Create a shared invoice for forwarders or containers"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <div className="flex gap-2">
                <Select
                  value={type}
                  onValueChange={(value) => {
                    if (value === "__custom__") {
                      setValue("type", "");
                    } else {
                      setValue("type", value);
                      // Reset modification flag when type changes so defaults can apply
                      if (!invoice) {
                        setHasModifiedCostItems(false);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FORWARDER">Forwarder</SelectItem>
                    <SelectItem value="CONTAINER">Container</SelectItem>
                    <SelectItem value="__custom__">Other</SelectItem>
                  </SelectContent>
                </Select>
                {(type === "__custom__" ||
                  (!["FORWARDER", "CONTAINER"].includes(type) && type)) && (
                  <Input
                    placeholder="Enter other type"
                    value={type === "__custom__" ? "" : type}
                    onChange={(e) => {
                      setValue("type", e.target.value);
                      if (!invoice) {
                        setHasModifiedCostItems(false);
                      }
                    }}
                    className="flex-1"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Vendor *</Label>
              <Select
                value={watch("vendorId") || "__none__"}
                onValueChange={(value) => {
                  if (value === "__create__") {
                    setShowVendorForm(true);
                  } else {
                    setValue("vendorId", value === "__none__" ? "" : value, {
                      shouldValidate: true,
                    });
                  }
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__create__">
                    + Create new vendor
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.vendorId && (
                <p className="text-sm text-red-500">
                  {errors.vendorId.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentDeadline">Payment Deadline *</Label>
                <DatePicker id="paymentDeadline" {...register("paymentDeadline")} />
                {errors.paymentDeadline && (
                  <p className="text-sm text-red-500">{errors.paymentDeadline.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Payment Date</Label>
                <DatePicker id="date" {...register("date")} />
                {errors.date && (
                  <p className="text-sm text-red-500">{errors.date.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Optional - set when payment is made
                </p>
              </div>
              <div className="space-y-2">
                <Label>Total Amount</Label>
                <div className="h-10 flex items-center px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800">
                  ¥{totalAmount.toLocaleString("en-US")}
                </div>
                <p className="text-xs text-muted-foreground">
                  Calculated from cost items below
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cost Items *</Label>
              <div className="space-y-3">
                {fields.map((field, index) => {
                  const amount = parseFloat(
                    (watch(`costItems.${index}.amount`) || "").replace(
                      /,/g,
                      "",
                    ) || "0",
                  );
                  return (
                    <div
                      key={field.id}
                      className="space-y-2 p-3 border rounded-lg"
                    >
                      <div className="flex gap-2">
                        <Input
                          placeholder="Description (e.g., Ocean Freight, Vanning, Forwarding)"
                          {...register(`costItems.${index}.description`)}
                          className="flex-1"
                          onChange={(e) => {
                            setHasModifiedCostItems(true);
                            register(`costItems.${index}.description`).onChange(
                              e,
                            );
                          }}
                        />
                        <div className="relative w-32">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                            ¥
                          </span>
                          <Input
                            type="text"
                            placeholder="0"
                            {...register(`costItems.${index}.amount`)}
                            className="text-right pl-6"
                            onChange={(e) => {
                              setHasModifiedCostItems(true);
                              const value = e.target.value.replace(
                                /[^\d]/g,
                                "",
                              );
                              if (value === "") {
                                setValue(`costItems.${index}.amount`, "");
                              } else {
                                const formatted = parseInt(
                                  value,
                                  10,
                                ).toLocaleString("en-US");
                                setValue(
                                  `costItems.${index}.amount`,
                                  formatted,
                                );
                              }
                            }}
                          />
                        </div>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setHasModifiedCostItems(true);
                              remove(index);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <span className="material-symbols-outlined text-sm">
                              close
                            </span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setHasModifiedCostItems(true);
                    append({ description: "", amount: "" });
                  }}
                  className="w-full"
                >
                  <span className="material-symbols-outlined text-sm mr-1">
                    add
                  </span>
                  Add Cost Item
                </Button>
              </div>
              {errors.costItems && (
                <p className="text-sm text-red-500">
                  {errors.costItems.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Vehicles *</Label>
              <Input
                placeholder="Search by VIN, make, or model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && vehicles.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="p-2 hover:bg-accent cursor-pointer"
                      onClick={() => addVehicle(vehicle)}
                    >
                      {vehicleDisplay(vehicle)}
                    </div>
                  ))}
                </div>
              )}

              {selectedVehicles.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="text-sm font-medium">
                    Selected Vehicles ({selectedVehicles.length}):
                  </div>
                  <div className="space-y-1">
                    {selectedVehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className="flex items-center justify-between p-2 border rounded bg-muted/20"
                      >
                        <span className="text-sm">
                          {vehicleDisplay(vehicle)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            ¥{allocatedAmount.toLocaleString()}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeVehicle(vehicle.id)}
                          >
                            <span className="material-symbols-outlined text-sm">
                              close
                            </span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalAmount > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Total: ¥{totalAmount.toLocaleString("en-US")} ÷{" "}
                      {selectedVehicles.length} = ¥
                      {allocatedAmount.toLocaleString("en-US")} per vehicle
                    </div>
                  )}
                </div>
              )}
              {errors.vehicleIds && (
                <p className="text-sm text-red-500">
                  {errors.vehicleIds.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : invoice ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {showVendorForm && (
        <VendorForm
          vendor={null}
          onClose={async (createdVendorId?: string) => {
            setShowVendorForm(false);
            // If a vendor was created, set it as the form vendor first
            if (createdVendorId) {
              setValue("vendorId", createdVendorId, {
                shouldValidate: true,
              });
            }
            // Refresh vendors list after setting the value
            await fetchVendors();
          }}
        />
      )}
    </div>
  );
}
