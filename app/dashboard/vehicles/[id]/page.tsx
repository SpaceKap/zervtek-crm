"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShippingStage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VehicleStageForms } from "@/components/VehicleStageForms";
import { VehicleDocumentsManager } from "@/components/VehicleDocumentsManager";
import { VehiclePaymentTracker } from "@/components/VehiclePaymentTracker";
import { VehicleStageHistory } from "@/components/VehicleStageHistory";
import { VehicleExpensesManager } from "@/components/VehicleExpensesManager";
import { StageNavigation } from "@/components/StageNavigation";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface Vendor {
  id: string;
  name: string;
  email: string | null;
}

interface Yard {
  id: string;
  name: string;
  vendor: Vendor | null;
}

interface Vehicle {
  id: string;
  vin: string;
  stockNo: string | null;
  chassisNo: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  auctionHouse: string | null;
  lotNo: string | null;
  purchaseDate: Date | null;
  currentShippingStage: ShippingStage | null;
  isRegistered: boolean | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  shippingStage: any;
  stageHistory: any[];
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
  }>;
  _count?: {
    documents: number;
    stageCosts: number;
  };
}

const stageLabels: Record<ShippingStage, string> = {
  PURCHASE: "Purchase",
  TRANSPORT: "Transport",
  REPAIR: "Repair",
  DOCUMENTS: "Documents",
  BOOKING: "Booking",
  SHIPPED: "Shipped",
  DHL: "Completed",
};

const stageColors: Record<ShippingStage, string> = {
  PURCHASE:
    "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800",
  TRANSPORT:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
  REPAIR:
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
  DOCUMENTS:
    "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
  BOOKING:
    "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800",
  SHIPPED:
    "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800",
  DHL: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 bg-gray-200 dark:bg-[#2C2C2C] rounded-lg"></div>
      <div className="h-96 bg-gray-200 dark:bg-[#2C2C2C] rounded-lg"></div>
    </div>
  );
}

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [yards, setYards] = useState<Yard[]>([]);
  const [customers, setCustomers] = useState<
    Array<{ id: string; name: string; email: string | null }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [savingStage, setSavingStage] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [viewingStage, setViewingStage] = useState<ShippingStage | null>(null);

  useEffect(() => {
    if (vehicleId) {
      fetchVehicle();
      fetchVendors();
      fetchYards();
      fetchCustomers();
    }
  }, [vehicleId]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(
          data.map((c: any) => ({ id: c.id, name: c.name, email: c.email })),
        );
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const handleAssignCustomer = async (customerId: string) => {
    try {
      setSavingCustomer(true);
      const finalCustomerId = customerId === "__none__" ? null : customerId;
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: finalCustomerId }),
      });
      if (response.ok) {
        await fetchVehicle();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to assign customer");
      }
    } catch (error) {
      console.error("Error assigning customer:", error);
      alert("Failed to assign customer");
    } finally {
      setSavingCustomer(false);
    }
  };

  // Refetch vendors when viewing stage changes
  useEffect(() => {
    if (viewingStage && vehicle) {
      // Update vendor filter based on viewing stage
      fetchVendors();
    }
  }, [viewingStage, vehicle]);

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vehicles/${vehicleId}/stages`);
      if (response.ok) {
        const data = await response.json();
        setVehicle(data);
        // Initialize viewing stage to current stage if not set
        if (!viewingStage) {
          setViewingStage(data.currentShippingStage || ShippingStage.PURCHASE);
        }
      }
    } catch (error) {
      console.error("Error fetching vehicle:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      // Fetch all vendors (no stage filtering)
      const response = await fetch("/api/vendors");
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  const fetchYards = async () => {
    try {
      const response = await fetch("/api/yards", {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        setYards(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch yards:", response.status, errorData);
      }
    } catch (error) {
      console.error("Error fetching yards:", error);
    }
  };

  const handleStageChange = async (newStage: ShippingStage) => {
    try {
      setSavingStage(true);
      const response = await fetch(`/api/vehicles/${vehicleId}/stages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });

      if (response.ok) {
        fetchVehicle();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error changing stage:", error);
      alert("Failed to change stage");
    } finally {
      setSavingStage(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#2C2C2C] flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl text-gray-400">
              error_outline
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Vehicle Not Found
            </h2>
            <p className="text-gray-500 dark:text-[#A1A1A1] mb-6">
              The vehicle you&apos;re looking for doesn&apos;t exist or has been
              removed.
            </p>
          </div>
          <Button
            onClick={() =>
              router.push("/dashboard/financial-operations?section=vehicles")
            }
          >
            <span className="material-symbols-outlined text-lg mr-2">
              arrow_back
            </span>
            Back to Vehicles
          </Button>
        </div>
      </div>
    );
  }

  const vehicleTitle =
    vehicle.make && vehicle.model && vehicle.year
      ? `${vehicle.make} ${vehicle.model} ${vehicle.year}`
      : vehicle.vin || "Unknown Vehicle";

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-[#A1A1A1]">
        <button
          onClick={() => router.push("/dashboard")}
          className="hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Dashboard
        </button>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <button
          onClick={() =>
            router.push("/dashboard/financial-operations?section=vehicles")
          }
          className="hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Vehicles
        </button>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-gray-900 dark:text-white font-medium">
          {vehicleTitle}
        </span>
      </nav>

      {/* Main Layout: Left (Main Content) + Right (Details Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Combined Header & Overview Card - Minimized */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 dark:from-[#D4AF37] dark:to-[#FFD700] flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white text-xl">
                    directions_car
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl mb-1">{vehicleTitle}</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    {vehicle.vin}
                  </CardDescription>
                </div>
                {vehicle.currentShippingStage && (
                  <Badge
                    className={`${stageColors[vehicle.currentShippingStage]} border`}
                  >
                    {stageLabels[vehicle.currentShippingStage]}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <div className="flex items-center gap-6 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-[#A1A1A1]">
                    Make:
                  </span>
                  <span className="font-medium">{vehicle.make || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-[#A1A1A1]">
                    Model:
                  </span>
                  <span className="font-medium">{vehicle.model || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-[#A1A1A1]">
                    Year:
                  </span>
                  <span className="font-medium">{vehicle.year || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-[#A1A1A1]">
                    Registration:
                  </span>
                  <span className="font-medium">
                    {vehicle.isRegistered === null
                      ? "Unknown"
                      : vehicle.isRegistered
                        ? "Registered"
                        : "Not Registered"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content - Stage Management */}
          <div className="w-full">
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl">
                          settings
                        </span>
                        Stage Management
                      </CardTitle>
                      <CardDescription>
                        Configure stage-specific settings and requirements
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-gray-500 dark:text-[#A1A1A1] whitespace-nowrap">
                          Current Stage:
                        </Label>
                        <Select
                          value={vehicle.currentShippingStage || "PURCHASE"}
                          onValueChange={(value) =>
                            handleStageChange(value as ShippingStage)
                          }
                          disabled={savingStage}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(stageLabels).map(
                              ([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Stage Navigation */}
                  {viewingStage && (
                    <div className="pt-2 border-t border-gray-200 dark:border-[#2C2C2C]">
                      <StageNavigation
                        currentStage={vehicle.currentShippingStage}
                        viewingStage={viewingStage}
                        onViewingStageChange={setViewingStage}
                        disabled={savingStage}
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {viewingStage ? (
                  <VehicleStageForms
                    vehicleId={vehicleId}
                    currentStage={viewingStage}
                    stageData={vehicle.shippingStage}
                    vendors={vendors}
                    yards={yards}
                    isRegistered={vehicle.isRegistered}
                    vehicle={{
                      vin: vehicle.vin,
                      stockNo: vehicle.stockNo,
                      make: vehicle.make,
                      model: vehicle.model,
                      year: vehicle.year,
                      chassisNo: vehicle.chassisNo,
                      auctionHouse: vehicle.auctionHouse,
                      lotNo: vehicle.lotNo,
                      purchaseDate: vehicle.purchaseDate,
                    }}
                    onUpdate={fetchVehicle}
                  />
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#2C2C2C] flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-3xl text-gray-400">
                        info
                      </span>
                    </div>
                    <p className="text-gray-500 dark:text-[#A1A1A1] mb-4">
                      Please select a shipping stage first
                    </p>
                    <Select
                      value={viewingStage || "PURCHASE"}
                      onValueChange={(value) => {
                        const stage = value as ShippingStage;
                        setViewingStage(stage);
                      }}
                      disabled={savingStage}
                    >
                      <SelectTrigger className="w-48 mx-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(stageLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Details Sidebar (1/3 width) */}
        <div className="space-y-6">
          {/* Customer & Yard Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">
                  person
                </span>
                Customer & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-gray-500 dark:text-[#A1A1A1]">
                  Customer
                </Label>
                {vehicle.customer ? (
                  <div className="mt-1 space-y-2">
                    <Link
                      href={`/dashboard/customers/${vehicle.customer.id}`}
                      className="block group"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary dark:group-hover:text-[#D4AF37] transition-colors">
                        {vehicle.customer.name}
                      </p>
                      {vehicle.customer.email && (
                        <p className="text-xs text-gray-500 dark:text-[#A1A1A1] mt-1">
                          {vehicle.customer.email}
                        </p>
                      )}
                      {vehicle.customer.phone && (
                        <p className="text-xs text-gray-500 dark:text-[#A1A1A1]">
                          {vehicle.customer.phone}
                        </p>
                      )}
                    </Link>
                    <Select
                      value={vehicle.customer.id}
                      onValueChange={handleAssignCustomer}
                      disabled={savingCustomer}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None (Remove customer)</SelectItem>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}{" "}
                            {customer.email ? `(${customer.email})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 dark:text-[#A1A1A1]">
                      No customer assigned
                    </p>
                    <Select
                      value="__none__"
                      onValueChange={handleAssignCustomer}
                      disabled={savingCustomer}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Assign a customer..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}{" "}
                            {customer.email ? `(${customer.email})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {vehicle.shippingStage?.yard && (
                <div>
                  <Label className="text-xs text-gray-500 dark:text-[#A1A1A1]">
                    Storage Yard
                  </Label>
                  <p className="text-sm font-medium mt-1">
                    {vehicle.shippingStage.yard.name}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">
                  receipt
                </span>
                Invoice
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vehicle.invoices && vehicle.invoices.length > 0 ? (
                <div className="space-y-2">
                  {vehicle.invoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="block"
                    >
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <span className="material-symbols-outlined text-lg mr-2">
                          receipt_long
                        </span>
                        View Invoice: {invoice.invoiceNumber}
                      </Button>
                    </Link>
                  ))}
                  <Link
                    href={`/dashboard/invoices/new?vehicleId=${vehicle.id}${vehicle.customer ? `&customerId=${vehicle.customer.id}` : ""}`}
                    className="block mt-2"
                  >
                    <Button variant="outline" className="w-full">
                      <span className="material-symbols-outlined text-lg mr-2">
                        add
                      </span>
                      Create Another Invoice
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link
                  href={`/dashboard/invoices/new?vehicleId=${vehicle.id}${vehicle.customer ? `&customerId=${vehicle.customer.id}` : ""}`}
                  className="block"
                >
                  <Button className="w-full">
                    <span className="material-symbols-outlined text-lg mr-2">
                      add
                    </span>
                    Create Invoice
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Expenses Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">
                  receipt_long
                </span>
                Expenses
              </CardTitle>
              <CardDescription>
                Track all expenses for this vehicle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VehicleExpensesManager
                vehicleId={vehicleId}
                onUpdate={fetchVehicle}
              />
            </CardContent>
          </Card>

          {/* Payment Tracker Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">
                  payments
                </span>
                Payment Tracking
              </CardTitle>
              <CardDescription>
                Monitor payments and charges for this vehicle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VehiclePaymentTracker vehicleId={vehicleId} />
            </CardContent>
          </Card>

          {/* Document Library Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">
                  description
                </span>
                Document Library
              </CardTitle>
              <CardDescription>
                Upload and manage documents for this vehicle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VehicleDocumentsManager
                vehicleId={vehicleId}
                currentStage={vehicle.currentShippingStage}
              />
            </CardContent>
          </Card>

          {/* Stage History Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">
                  history
                </span>
                Stage History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleStageHistory vehicleId={vehicleId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
