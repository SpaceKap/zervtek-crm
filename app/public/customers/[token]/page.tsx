"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PublicCustomerPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  useEffect(() => {
    if (data?.vehicles?.length > 0 && !selectedVehicle) {
      setSelectedVehicle(data.vehicles[0].id);
    }
  }, [data, selectedVehicle]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/public/customers/${token}/vehicles`);
      if (response.ok) {
        const data = await response.json();
        setData(data);
      } else {
        setError("Unable to load your information. Please check your link.");
      }
    } catch (error) {
      console.error("Error fetching customer data:", error);
      setError("Failed to load data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const stageLabels: Record<string, string> = {
    PURCHASE: "Purchase",
    TRANSPORT: "Transport",
    REPAIR: "Repair & Storage",
    DOCUMENTS: "Documents",
    BOOKING: "Booking",
    SHIPPED: "Shipped",
    DHL: "Completed",
  };

  const stageIcons: Record<string, string> = {
    PURCHASE: "shopping_cart",
    TRANSPORT: "local_shipping",
    REPAIR: "build",
    DOCUMENTS: "description",
    BOOKING: "event",
    SHIPPED: "sailing",
    DHL: "check_circle",
  };

  const stageOrder = [
    "PURCHASE",
    "TRANSPORT",
    "REPAIR",
    "DOCUMENTS",
    "BOOKING",
    "SHIPPED",
    "DHL",
  ];

  const getStageProgress = (currentStage: string | null): number => {
    if (!currentStage) return 0;
    const index = stageOrder.indexOf(currentStage);
    return index >= 0 ? ((index + 1) / stageOrder.length) * 100 : 0;
  };

  const getDocumentIcon = (category: string): string => {
    const iconMap: Record<string, string> = {
      INVOICE: "receipt",
      PHOTOS: "photo_library",
      ETD_ETA: "schedule",
      EXPORT_CERTIFICATE: "verified",
      DEREGISTRATION_CERTIFICATE: "description",
      BILL_OF_LADING: "description",
      DHL_TRACKING: "local_shipping",
      AUCTION_SHEET: "description",
      OTHER: "insert_drive_file",
    };
    return iconMap[category] || "description";
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return format(date, "MMM dd, yyyy");
    } catch {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-0 shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 p-4 rounded-full bg-red-50 dark:bg-red-900/20 w-fit">
              <span className="material-symbols-outlined text-4xl text-red-600 dark:text-red-400">
                error
              </span>
            </div>
            <CardTitle className="text-2xl mb-2">Unable to Load</CardTitle>
            <CardDescription className="text-base">
              {error || "Invalid or expired link"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentVehicle =
    data.vehicles.find((v: any) => v.id === selectedVehicle) ||
    data.vehicles[0];

  const allDocuments = data.vehicles.flatMap((v: any) =>
    v.documents.map((doc: any) => ({ ...doc, vehicleId: v.id, vehicle: v }))
  );
  const allInvoices = data.vehicles.flatMap((v: any) =>
    v.invoices.map((inv: any) => ({ ...inv, vehicleId: v.id, vehicle: v }))
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-white dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {data.customer.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Vehicle Tracking Portal
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 dark:bg-primary/20">
              <span className="material-symbols-outlined text-primary dark:text-[#D4AF37]">
                directions_car
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {data.vehicles.length} Vehicle{data.vehicles.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {data.vehicles.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-20 text-center">
              <div className="mx-auto mb-6 p-5 rounded-full bg-gray-100 dark:bg-gray-800 w-fit">
                <span className="material-symbols-outlined text-5xl text-gray-400 dark:text-gray-600">
                  directions_car
                </span>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                No Vehicles Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Your vehicles will appear here once they are added to the system.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Vehicle Selector */}
            {data.vehicles.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {data.vehicles.map((vehicle: any) => (
                  <button
                    key={vehicle.id}
                    onClick={() => {
                      setSelectedVehicle(vehicle.id);
                      setActiveTab("overview");
                    }}
                    className={`flex-shrink-0 px-6 py-3 rounded-xl font-medium transition-all ${
                      selectedVehicle === vehicle.id
                        ? "bg-primary text-white shadow-lg"
                        : "bg-white dark:bg-[#1A1A1A] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252525] border border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-semibold">
                        {vehicle.make} {vehicle.model}
                        {vehicle.year && ` ${vehicle.year}`}
                      </div>
                      <div className="text-xs opacity-80 mt-0.5">
                        {vehicle.vin.slice(-6)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-3 mb-6 bg-white dark:bg-[#1A1A1A]">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="documents">
                  Documents
                  {allDocuments.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {allDocuments.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="invoices">
                  Invoices
                  {allInvoices.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {allInvoices.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {currentVehicle && (
                  <Card className="border-0 shadow-lg overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 pb-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-2xl sm:text-3xl mb-2">
                            {currentVehicle.make} {currentVehicle.model}
                            {currentVehicle.year && ` ${currentVehicle.year}`}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-3">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-base">
                                pin
                              </span>
                              <span className="font-mono">
                                {currentVehicle.vin}
                              </span>
                            </div>
                            {currentVehicle.stockNo && (
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-base">
                                  inventory_2
                                </span>
                                <span>Stock: {currentVehicle.stockNo}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {currentVehicle.currentShippingStage && (
                          <Badge
                            className={`px-4 py-2 text-sm font-semibold ${
                              currentVehicle.currentShippingStage === "DHL"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                            }`}
                          >
                            {stageLabels[currentVehicle.currentShippingStage]}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-8">
                      {/* Progress Timeline */}
                      {currentVehicle.currentShippingStage && (
                        <div className="mb-8">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              Shipping Progress
                            </h3>
                            <span className="text-sm font-semibold text-primary dark:text-[#D4AF37]">
                              {Math.round(
                                getStageProgress(
                                  currentVehicle.currentShippingStage
                                )
                              )}
                              %
                            </span>
                          </div>
                          <div className="relative">
                            {/* Progress Bar */}
                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-8">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-primary/80 dark:from-[#D4AF37] dark:to-[#D4AF37]/80 transition-all duration-700 ease-out rounded-full"
                                style={{
                                  width: `${getStageProgress(
                                    currentVehicle.currentShippingStage
                                  )}%`,
                                }}
                              ></div>
                            </div>

                            {/* Timeline Steps */}
                            <div className="relative">
                              <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-800"></div>
                              <div className="relative flex justify-between">
                                {stageOrder.map((stage, index) => {
                                  const isCompleted =
                                    stageOrder.indexOf(
                                      currentVehicle.currentShippingStage
                                    ) > index;
                                  const isCurrent =
                                    stage === currentVehicle.currentShippingStage;
                                  const progress = getStageProgress(
                                    currentVehicle.currentShippingStage
                                  );
                                  const stageProgress =
                                    ((index + 1) / stageOrder.length) * 100;

                                  return (
                                    <div
                                      key={stage}
                                      className="flex flex-col items-center flex-1 relative z-10"
                                    >
                                      <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-all ${
                                          isCompleted
                                            ? "bg-primary dark:bg-[#D4AF37] text-white shadow-lg"
                                            : isCurrent
                                            ? "bg-primary dark:bg-[#D4AF37] text-white ring-4 ring-primary/20 dark:ring-[#D4AF37]/20 shadow-lg scale-110"
                                            : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
                                        }`}
                                      >
                                        <span className="material-symbols-outlined text-lg">
                                          {stageIcons[stage] || "circle"}
                                        </span>
                                      </div>
                                      <div className="text-center max-w-[80px]">
                                        <div
                                          className={`text-xs font-medium mb-1 ${
                                            isCompleted || isCurrent
                                              ? "text-gray-900 dark:text-white"
                                              : "text-gray-500 dark:text-gray-500"
                                          }`}
                                        >
                                          {stageLabels[stage]}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Quick Stats */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                                description
                              </span>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {currentVehicle.documents.length}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                Documents
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                              <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                                receipt_long
                              </span>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {currentVehicle.invoices.length}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                Invoices
                              </div>
                            </div>
                          </div>
                        </div>
                        {currentVehicle.shippingStage?.yard && (
                          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">
                                  warehouse
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {currentVehicle.shippingStage.yard.name}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  Storage Yard
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4">
                {allDocuments.length === 0 ? (
                  <Card className="border-0 shadow-lg">
                    <CardContent className="py-16 text-center">
                      <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-700 mb-4 block">
                        description
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No Documents Available
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Documents will appear here once they are uploaded.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allDocuments.map((doc: any) => (
                      <a
                        key={doc.id}
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-5 rounded-xl bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-800 hover:border-primary dark:hover:border-[#D4AF37] hover:shadow-lg transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-primary/10 dark:bg-primary/20 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors flex-shrink-0">
                            <span className="material-symbols-outlined text-2xl text-primary dark:text-[#D4AF37]">
                              {getDocumentIcon(doc.category || "OTHER")}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                              {doc.name}
                            </h4>
                            {doc.category && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                {doc.category.replace(/_/g, " ")}
                              </p>
                            )}
                            {doc.vehicle && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {doc.vehicle.make} {doc.vehicle.model}
                                {doc.vehicle.year && ` ${doc.vehicle.year}`}
                              </p>
                            )}
                          </div>
                          <span className="material-symbols-outlined text-gray-400 dark:text-gray-600 group-hover:text-primary dark:group-hover:text-[#D4AF37] transition-colors flex-shrink-0">
                            open_in_new
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Invoices Tab */}
              <TabsContent value="invoices" className="space-y-4">
                {allInvoices.length === 0 ? (
                  <Card className="border-0 shadow-lg">
                    <CardContent className="py-16 text-center">
                      <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-700 mb-4 block">
                        receipt_long
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No Invoices Available
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Invoices will appear here once they are finalized.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {allInvoices.map((invoice: any) => {
                      const totalAmount =
                        invoice.charges?.reduce(
                          (sum: number, charge: any) =>
                            sum +
                            parseFloat(charge.amount?.toString() || "0"),
                          0
                        ) || 0;
                      const isPaid = invoice.paymentStatus === "PAID";
                      const isOverdue = invoice.paymentStatus === "OVERDUE";
                      const isPartial =
                        invoice.paymentStatus === "PARTIALLY_PAID";

                      return (
                        <Card
                          key={invoice.id}
                          className="border-0 shadow-lg hover:shadow-xl transition-shadow"
                        >
                          <CardContent className="p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
                                    <span className="material-symbols-outlined text-primary dark:text-[#D4AF37]">
                                      receipt_long
                                    </span>
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                      {invoice.invoiceNumber}
                                    </h3>
                                    {invoice.vehicle && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {invoice.vehicle.make}{" "}
                                        {invoice.vehicle.model}
                                        {invoice.vehicle.year &&
                                          ` ${invoice.vehicle.year}`}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                                  {invoice.issueDate && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-base">
                                        calendar_today
                                      </span>
                                      <span>Issued: {formatDate(invoice.issueDate)}</span>
                                    </div>
                                  )}
                                  {invoice.dueDate && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-base">
                                        event
                                      </span>
                                      <span>Due: {formatDate(invoice.dueDate)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-3">
                                <Badge
                                  className={`px-4 py-2 text-sm font-semibold ${
                                    isPaid
                                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                      : isOverdue
                                      ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                                      : isPartial
                                      ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
                                  }`}
                                >
                                  {isPaid
                                    ? "Paid"
                                    : isOverdue
                                    ? "Overdue"
                                    : isPartial
                                    ? "Partial"
                                    : "Pending"}
                                </Badge>
                                {totalAmount > 0 && (
                                  <div className="text-right">
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                      Total Amount
                                    </div>
                                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                                      ¥{totalAmount.toLocaleString()}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
