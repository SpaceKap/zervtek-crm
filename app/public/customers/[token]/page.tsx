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
import { Separator } from "@/components/ui/separator";

export default function PublicCustomerPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

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

  const stageColors: Record<string, string> = {
    PURCHASE: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    TRANSPORT: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    REPAIR: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    DOCUMENTS: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    BOOKING: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    SHIPPED: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800",
    DHL: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#121212] dark:via-[#1E1E1E] dark:to-[#121212]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#121212] dark:via-[#1E1E1E] dark:to-[#121212] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-red-100 dark:bg-red-900/30 w-fit">
              <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400">
                error
              </span>
            </div>
            <CardTitle className="text-xl">Unable to Load</CardTitle>
            <CardDescription className="mt-2">
              {error || "Invalid or expired link"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#121212] dark:via-[#1E1E1E] dark:to-[#121212]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header Section */}
        <Card className="mb-8 border-0 shadow-lg bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 dark:bg-primary/20">
                <span className="material-symbols-outlined text-4xl text-primary dark:text-[#D4AF37]">
                  dashboard
                </span>
              </div>
              <div className="flex-1">
                <CardTitle className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome, {data.customer.name}
                </CardTitle>
                <CardDescription className="text-base sm:text-lg">
                  Track your vehicles and monitor their shipping progress
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Vehicles List */}
        {data.vehicles.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-gray-100 dark:bg-gray-800 w-fit">
                <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-600">
                  directions_car
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Vehicles Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your vehicles will appear here once they are added to the system.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {data.vehicles.map((vehicle: any) => {
              const currentStage = vehicle.currentShippingStage;
              const progress = getStageProgress(currentStage);

              return (
                <Card
                  key={vehicle.id}
                  className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden"
                >
                  <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-white dark:from-[#1E1E1E] dark:to-[#252525]">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-xl bg-primary/10 dark:bg-primary/20 flex-shrink-0">
                            <span className="material-symbols-outlined text-3xl text-primary dark:text-[#D4AF37]">
                              directions_car
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                              {vehicle.make} {vehicle.model}
                              {vehicle.year && ` ${vehicle.year}`}
                            </CardTitle>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-base">
                                  pin
                                </span>
                                <span className="font-mono font-medium">
                                  VIN: {vehicle.vin}
                                </span>
                              </div>
                              {vehicle.stockNo && (
                                <>
                                  <span>•</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-base">
                                      inventory_2
                                    </span>
                                    <span>Stock: {vehicle.stockNo}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {currentStage && (
                        <Badge
                          className={`px-4 py-2 text-sm font-semibold border ${stageColors[currentStage] || stageColors.PURCHASE}`}
                        >
                          {stageLabels[currentStage] || currentStage}
                        </Badge>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {currentStage && (
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Shipping Progress
                          </span>
                          <span className="text-xs font-semibold text-primary dark:text-[#D4AF37]">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/80 dark:from-[#D4AF37] dark:to-[#D4AF37]/80 transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        {/* Stage Timeline */}
                        <div className="mt-4 flex items-center justify-between text-xs">
                          {stageOrder.map((stage, index) => {
                            const isActive =
                              stageOrder.indexOf(currentStage) >= index;
                            const isCurrent = stage === currentStage;
                            return (
                              <div
                                key={stage}
                                className="flex flex-col items-center flex-1"
                              >
                                <div
                                  className={`w-2 h-2 rounded-full mb-1 ${
                                    isActive
                                      ? "bg-primary dark:bg-[#D4AF37]"
                                      : "bg-gray-300 dark:bg-gray-700"
                                  } ${isCurrent ? "ring-2 ring-primary dark:ring-[#D4AF37] ring-offset-2" : ""}`}
                                ></div>
                                <span
                                  className={`text-center ${
                                    isActive
                                      ? "text-gray-900 dark:text-white font-medium"
                                      : "text-gray-400 dark:text-gray-600"
                                  }`}
                                >
                                  {stageLabels[stage] || stage}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {vehicle.shippingStage?.yard && (
                      <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                            warehouse
                          </span>
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                            Storage Yard: {vehicle.shippingStage.yard.name}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Documents Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="material-symbols-outlined text-xl text-gray-700 dark:text-gray-300">
                            folder
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Documents
                          </h3>
                          {vehicle.documents.length > 0 && (
                            <Badge variant="secondary" className="ml-auto">
                              {vehicle.documents.length}
                            </Badge>
                          )}
                        </div>
                        {vehicle.documents.length === 0 ? (
                          <div className="p-6 text-center rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-300 dark:border-gray-700">
                            <span className="material-symbols-outlined text-3xl text-gray-400 dark:text-gray-600 mb-2 block">
                              description
                            </span>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              No documents available yet
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {vehicle.documents.map((doc: any) => (
                              <a
                                key={doc.id}
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700 group"
                              >
                                <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
                                  <span className="material-symbols-outlined text-lg text-primary dark:text-[#D4AF37]">
                                    {getDocumentIcon(doc.category || "OTHER")}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {doc.name}
                                  </p>
                                  {doc.category && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {doc.category.replace(/_/g, " ")}
                                    </p>
                                  )}
                                </div>
                                <span className="material-symbols-outlined text-gray-400 dark:text-gray-600 group-hover:text-primary dark:group-hover:text-[#D4AF37] transition-colors">
                                  open_in_new
                                </span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Invoices Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="material-symbols-outlined text-xl text-gray-700 dark:text-gray-300">
                            receipt_long
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Invoices
                          </h3>
                          {vehicle.invoices.length > 0 && (
                            <Badge variant="secondary" className="ml-auto">
                              {vehicle.invoices.length}
                            </Badge>
                          )}
                        </div>
                        {vehicle.invoices.length === 0 ? (
                          <div className="p-6 text-center rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-300 dark:border-gray-700">
                            <span className="material-symbols-outlined text-3xl text-gray-400 dark:text-gray-600 mb-2 block">
                              receipt_long
                            </span>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              No invoices available yet
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {vehicle.invoices.map((invoice: any) => {
                              const totalAmount = invoice.charges?.reduce(
                                (sum: number, charge: any) =>
                                  sum + parseFloat(charge.amount?.toString() || "0"),
                                0
                              ) || 0;
                              const isPaid = invoice.paymentStatus === "PAID";
                              const isOverdue =
                                invoice.paymentStatus === "OVERDUE";

                              return (
                                <div
                                  key={invoice.id}
                                  className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 hover:border-primary/50 dark:hover:border-[#D4AF37]/50 transition-colors"
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                          {invoice.invoiceNumber}
                                        </span>
                                      </div>
                                      {invoice.issueDate && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          Issued:{" "}
                                          {format(
                                            new Date(invoice.issueDate),
                                            "MMM dd, yyyy"
                                          )}
                                        </p>
                                      )}
                                      {invoice.dueDate && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          Due:{" "}
                                          {format(
                                            new Date(invoice.dueDate),
                                            "MMM dd, yyyy"
                                          )}
                                        </p>
                                      )}
                                    </div>
                                    <Badge
                                      className={`${
                                        isPaid
                                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800"
                                          : isOverdue
                                          ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800"
                                          : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800"
                                      } border`}
                                    >
                                      {invoice.paymentStatus === "PAID"
                                        ? "Paid"
                                        : invoice.paymentStatus ===
                                          "PARTIALLY_PAID"
                                        ? "Partial"
                                        : invoice.paymentStatus === "OVERDUE"
                                        ? "Overdue"
                                        : "Pending"}
                                    </Badge>
                                  </div>
                                  {totalAmount > 0 && (
                                    <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600 dark:text-gray-400">
                                          Total Amount
                                        </span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                          ¥{totalAmount.toLocaleString()}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
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
      </div>
    </div>
  );
}
