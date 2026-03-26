"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShippingStage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";
import { cn } from "@/lib/utils";

interface Vehicle {
  id: string;
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
  currentShippingStage: ShippingStage | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  shippingStage: {
    stage: ShippingStage;
    yard: { name: string } | null;
  } | null;
  _count: {
    documents: number;
    stageCosts: number;
  };
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
  }>;
  createdAt: string;
}

export default function VehiclesPage() {
  const isPwa = useStandalonePwa();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");

  useEffect(() => {
    fetchVehicles();
  }, [stageFilter, customerFilter]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (stageFilter !== "all") params.append("stage", stageFilter);
      if (customerFilter !== "all") params.append("customerId", customerFilter);

      const response = await fetch(`/api/vehicles?${params}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`[Vehicles Page] Fetched ${data.length} vehicles`);
        setVehicles(data);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("[Vehicles Page] API error:", response.status, errorData);
        alert(
          `Failed to fetch vehicles: ${errorData.error || errorData.details || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  const stageLabels: Record<ShippingStage, string> = {
    PURCHASE: "Purchase",
    TRANSPORT: "Transport",
    REPAIR: "Repair",
    DOCUMENTS: "Documents",
    BOOKING: "Booking",
    SHIPPED: "Shipped",
    DHL: "DHL",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-primary dark:text-[#D4AF37]">
            directions_car
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Vehicle Database
            </h1>
          </div>
        </div>
        <Link href="/dashboard/vehicles/new">
          <Button
            className={cn(
              "inline-flex items-center gap-2",
              isPwa && "h-10 w-10 rounded-full p-0",
            )}
            aria-label="Add vehicle"
          >
            <span className="material-symbols-outlined">add</span>
            {!isPwa && "Add Vehicle"}
          </Button>
        </Link>
      </div>

      <div className="bg-white dark:bg-[#1E1E1E] rounded-lg shadow p-4 sm:p-6">
        <div
          className={cn(
            "mb-4 gap-3",
            isPwa ? "grid grid-cols-1" : "flex flex-wrap gap-4",
          )}
        >
          <Input
            type="text"
            placeholder="Search by VIN, make, or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchVehicles()}
            className={cn(isPwa ? "w-full" : "min-w-[200px] flex-1")}
          />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className={cn(
              "h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-[#2C2C2C] dark:bg-[#1E1E1E] dark:text-white",
              isPwa ? "w-full" : "",
            )}
          >
            <option value="all">All Stages</option>
            {Object.entries(stageLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button
            onClick={fetchVehicles}
            className={cn(isPwa ? "w-full" : "px-4")}
          >
            Search
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No vehicles found
          </div>
        ) : isPwa ? (
          <div className="space-y-3">
            {vehicles.map((vehicle) => {
              const label =
                [vehicle.year, vehicle.make, vehicle.model]
                  .filter(Boolean)
                  .join(" ") || "Vehicle";
              return (
                <div
                  key={vehicle.id}
                  className="rounded-lg border border-border/70 bg-background/60 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {label}
                      </div>
                      <div className="truncate text-xs font-mono text-muted-foreground">
                        {vehicle.vin}
                      </div>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {vehicle.currentShippingStage
                        ? stageLabels[vehicle.currentShippingStage]
                        : "N/A"}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Customer: {vehicle.customer?.name || "N/A"}</div>
                    <div>Yard: {vehicle.shippingStage?.yard?.name || "N/A"}</div>
                    <div>Docs: {vehicle._count.documents}</div>
                    <div>Costs: {vehicle._count.stageCosts}</div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {vehicle.invoices && vehicle.invoices.length > 0 ? (
                      <Link
                        href={`/dashboard/invoices/${vehicle.invoices[0].id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {vehicle.invoices[0].invoiceNumber}
                      </Link>
                    ) : vehicle.customer ? (
                      <Link
                        href={`/dashboard/invoices/new?vehicleId=${vehicle.id}&customerId=${vehicle.customer.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Create invoice
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">No invoice</span>
                    )}
                    <div className="ml-auto">
                      <Link href={`/dashboard/vehicles/${vehicle.id}`}>
                        <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#2C2C2C]">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    VIN
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Vehicle
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Customer
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Stage
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Yard
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Documents
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Costs
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Invoice
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    className="border-b border-gray-200 dark:border-[#2C2C2C] hover:bg-gray-50 dark:hover:bg-[#2C2C2C]"
                  >
                    <td className="py-3 px-4 text-gray-900 dark:text-white font-mono text-sm">
                      {vehicle.vin}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {vehicle.make} {vehicle.model} {vehicle.year}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {vehicle.customer?.name || "N/A"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                        {vehicle.currentShippingStage
                          ? stageLabels[vehicle.currentShippingStage]
                          : "N/A"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {vehicle.shippingStage?.yard?.name || "N/A"}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {vehicle._count.documents}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {vehicle._count.stageCosts}
                    </td>
                    <td className="py-3 px-4">
                      {vehicle.invoices && vehicle.invoices.length > 0 ? (
                        <Link
                          href={`/dashboard/invoices/${vehicle.invoices[0].id}`}
                          className="text-primary hover:underline"
                        >
                          {vehicle.invoices[0].invoiceNumber}
                        </Link>
                      ) : vehicle.customer ? (
                        <Link
                          href={`/dashboard/invoices/new?vehicleId=${vehicle.id}&customerId=${vehicle.customer.id}`}
                          className="text-primary hover:underline text-sm"
                        >
                          Create Invoice
                        </Link>
                      ) : (
                        <span className="text-gray-500 dark:text-[#A1A1A1] text-sm">
                          N/A
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/dashboard/vehicles/${vehicle.id}`}
                        className="text-primary hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
