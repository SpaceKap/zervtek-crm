"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PublicCustomerPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/customers/${token}/vehicles`);
      if (response.ok) {
        const data = await response.json();
        setData(data);
      }
    } catch (error) {
      console.error("Error fetching customer data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!data) {
    return <div className="text-center py-8">Invalid or expired link</div>;
  }

  const stageLabels: Record<string, string> = {
    PURCHASE: "Purchase",
    TRANSPORT: "Transport",
    PAYMENT: "Payment",
    REPAIR: "Repair",
    DOCUMENTS: "Documents",
    BOOKING: "Booking",
    SHIPPED: "Shipped",
    DHL: "DHL",
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white dark:bg-[#1E1E1E] rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome, {data.customer.name}
          </h1>
          <p className="text-gray-600 dark:text-[#A1A1A1]">
            Track your vehicles and their current shipping status
          </p>
        </div>

        <div className="space-y-6">
          {data.vehicles.map((vehicle: any) => (
            <div
              key={vehicle.id}
              className="bg-white dark:bg-[#1E1E1E] rounded-lg shadow p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {vehicle.make} {vehicle.model} {vehicle.year}
                  </h2>
                  <p className="text-gray-600 dark:text-[#A1A1A1] font-mono text-sm">
                    VIN: {vehicle.vin}
                  </p>
                </div>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                  {vehicle.currentShippingStage
                    ? stageLabels[vehicle.currentShippingStage]
                    : "N/A"}
                </span>
              </div>

              {vehicle.shippingStage?.yard && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-[#A1A1A1]">
                    Storage Yard: {vehicle.shippingStage.yard.name}
                  </p>
                </div>
              )}

              {vehicle.documents.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Documents
                  </h3>
                  <div className="space-y-2">
                    {vehicle.documents.map((doc: any) => (
                      <a
                        key={doc.id}
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-primary hover:underline"
                      >
                        {doc.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {vehicle.invoices.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Invoices
                  </h3>
                  <div className="space-y-2">
                    {vehicle.invoices.map((invoice: any) => (
                      <div
                        key={invoice.id}
                        className="flex justify-between items-center"
                      >
                        <span className="text-gray-900 dark:text-white">
                          {invoice.invoiceNumber}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            invoice.paymentStatus === "PAID"
                              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                              : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                          }`}
                        >
                          {invoice.paymentStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
