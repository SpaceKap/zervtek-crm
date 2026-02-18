"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";

interface Customer {
  id: string;
  name: string;
  assignedTo?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface Vendor {
  id: string;
  name: string;
  category?: string;
}

export default function NewVehiclePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    vin: "",
    stockNo: "",
    make: "",
    model: "",
    year: "",
    price: "",
    purchaseSource: "" as "" | "AUCTION" | "DEALER",
    auctionHouseId: "",
    lotNo: "",
    auctionSheetFile: null as File | null,
    purchaseVendorId: "",
    purchasePhotoFile: null as File | null,
    purchaseDate: "",
    customerId: "",
    isRegistered: "false", // Default to "Not Registered"
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [companiesByCountry, setCompaniesByCountry] = useState<
    {
      country: string;
      companies: { company_id: number; name: string; country: string }[];
    }[]
  >([]);
  const [models, setModels] = useState<
    { model_id: number; name: string; company_ref: number }[]
  >([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [loadingVehicleData, setLoadingVehicleData] = useState(true);
  const [auctionSheetUrl, setAuctionSheetUrl] = useState<string>("");
  const [purchasePhotoUrl, setPurchasePhotoUrl] = useState<string>("");
  const [createInvoice, setCreateInvoice] = useState(false);
  const auctionSheetCameraRef = useRef<HTMLInputElement>(null);
  const purchasePhotoCameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCustomers();
    fetchVendors();
    loadVehicleData();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadModelsForCompany(parseInt(selectedCompanyId, 10));
      const company = companiesByCountry
        .flatMap((g) => g.companies)
        .find((c) => c.company_id.toString() === selectedCompanyId);
      setFormData((prev) => ({
        ...prev,
        make: company ? company.name : "",
        model: "",
      }));
    } else {
      setModels([]);
      setFormData((prev) => ({ ...prev, make: "", model: "" }));
    }
  }, [selectedCompanyId, companiesByCountry]);

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

  const auctionHouses = vendors.filter((v) => v.category === "AUCTION_HOUSE");
  const dealerships = vendors.filter((v) => v.category === "DEALERSHIP");

  const loadVehicleData = async () => {
    try {
      const companiesRes = await fetch("/api/vehicles/lookup?type=companies");
      const companiesData = await companiesRes.json();
      const companiesMap = new Map<
        string,
        { company_id: number; name: string; country: string }[]
      >();

      for (const company of companiesData) {
        const country = company.country || "OTHER";
        if (!companiesMap.has(country)) {
          companiesMap.set(country, []);
        }
        companiesMap.get(country)!.push(company);
      }

      for (const [country, companyList] of companiesMap.entries()) {
        companyList.sort((a, b) => a.name.localeCompare(b.name));
      }

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
      setLoadingVehicleData(false);
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

  const handleModelChange = (modelId: string) => {
    const selectedModel = models.find((m) => m.model_id.toString() === modelId);
    setFormData((prev) => ({
      ...prev,
      model: selectedModel ? selectedModel.name : "",
    }));
  };

  const handleFileUpload = async (
    file: File,
    type: "auctionSheet" | "purchasePhoto",
    vehicleId?: string,
    vin?: string,
  ) => {
    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      if (vehicleId && vin) {
        uploadFormData.append("context", "vehicle");
        uploadFormData.append("vehicleId", vehicleId);
        uploadFormData.append("vin", vin);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (response.ok) {
        const data = await response.json();
        if (type === "auctionSheet") {
          setAuctionSheetUrl(data.url);
        } else {
          setPurchasePhotoUrl(data.url);
        }
        return data.url;
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload file");
      }
    } catch (error: any) {
      console.error("Error uploading file:", error);
      alert(error.message || "Failed to upload file");
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vin) {
      alert("VIN is required");
      return;
    }
    if (!formData.make) {
      alert("Make is required");
      return;
    }
    if (!formData.model) {
      alert("Model is required");
      return;
    }

    try {
      setLoading(true);

      // Remove commas from price before sending
      const priceValue = formData.price
        ? parseFloat(formData.price.replace(/,/g, ""))
        : null;

      // Create vehicle first (without file URLs) so we get vehicleId for Paperless folder
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vin: formData.vin,
          chassisNo: formData.vin, // Same as VIN
          stockNo: null, // Auto-generated on backend
          make: formData.make || null,
          model: formData.model || null,
          year: formData.year ? parseInt(formData.year) : null,
          price: priceValue,
          purchaseSource: formData.purchaseSource || null,
          auctionHouseId:
            formData.purchaseSource === "AUCTION"
              ? formData.auctionHouseId || null
              : null,
          lotNo:
            formData.purchaseSource === "AUCTION"
              ? formData.lotNo || null
              : null,
          auctionSheetUrl: null,
          purchaseVendorId:
            formData.purchaseSource === "DEALER"
              ? formData.purchaseVendorId || null
              : null,
          purchasePhotoUrl: null,
          purchaseDate: formData.purchaseDate || null,
          customerId: formData.customerId || null,
          isRegistered: formData.isRegistered === "true",
        }),
      });

      if (response.ok) {
        const vehicle = await response.json();

        // Upload files with vehicleId for Paperless folder, then PATCH vehicle
        let finalAuctionSheetUrl: string | null = null;
        let finalPurchasePhotoUrl: string | null = null;

        if (formData.auctionSheetFile && formData.purchaseSource === "AUCTION") {
          finalAuctionSheetUrl = await handleFileUpload(
            formData.auctionSheetFile,
            "auctionSheet",
            vehicle.id,
            formData.vin,
          );
        }
        if (formData.purchasePhotoFile && formData.purchaseSource === "DEALER") {
          finalPurchasePhotoUrl = await handleFileUpload(
            formData.purchasePhotoFile,
            "purchasePhoto",
            vehicle.id,
            formData.vin,
          );
        }

        if (finalAuctionSheetUrl || finalPurchasePhotoUrl) {
          await fetch(`/api/vehicles/${vehicle.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              auctionSheetUrl: finalAuctionSheetUrl || undefined,
              purchasePhotoUrl: finalPurchasePhotoUrl || undefined,
            }),
          });
        }
        // Check if user wants to create invoice
        if (createInvoice && vehicle.customerId) {
          router.push(
            `/dashboard/invoices/new?vehicleId=${vehicle.id}&customerId=${vehicle.customerId}`,
          );
        } else {
          router.push(`/dashboard/vehicles/${vehicle.id}`);
        }
        setCreateInvoice(false); // Reset flag
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create vehicle");
      }
    } catch (error) {
      console.error("Error creating vehicle:", error);
      // Error message already shown by handleFileUpload if it's a file upload error
      if (!(error instanceof Error && error.message.includes("upload"))) {
        alert("Failed to create vehicle");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-4xl text-primary dark:text-[#D4AF37]">
          directions_car
        </span>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Add New Vehicle
          </h1>
          <p className="text-muted-foreground">
            Create a new vehicle entry in the database
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle Information</CardTitle>
          <CardDescription>
            Enter the vehicle details. VIN is required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  VIN (Chassis Number) <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.vin}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, vin: e.target.value }))
                  }
                  placeholder="Vehicle Identification Number"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Make <span className="text-red-500">*</span>
                </Label>
                {loadingVehicleData ? (
                  <Input placeholder="Loading..." disabled className="h-11" />
                ) : (
                  <Select
                    value={selectedCompanyId || undefined}
                    onValueChange={setSelectedCompanyId}
                  >
                    <SelectTrigger className="h-11">
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

              <div className="space-y-2">
                <Label>
                  Model <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={
                    models
                      .find((m) => m.name === formData.model)
                      ?.model_id.toString() || undefined
                  }
                  onValueChange={handleModelChange}
                  disabled={!selectedCompanyId || models.length === 0}
                >
                  <SelectTrigger className="h-11">
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

              <div className="space-y-2">
                <Label>Year</Label>
                <Select
                  value={formData.year || undefined}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, year: value }))
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      { length: new Date().getFullYear() - 1990 + 1 },
                      (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      },
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Purchase Price (JPY)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ¥
                  </span>
                  <Input
                    className="pl-8 h-11"
                    value={formData.price}
                    onChange={(e) => {
                      // Remove all non-digit characters
                      const numericValue = e.target.value.replace(/[^\d]/g, "");
                      // Format with commas
                      if (numericValue === "") {
                        setFormData((prev) => ({ ...prev, price: "" }));
                      } else {
                        const formatted = parseInt(
                          numericValue,
                          10,
                        ).toLocaleString("en-US");
                        setFormData((prev) => ({ ...prev, price: formatted }));
                      }
                    }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Purchase Source</Label>
                <Select
                  value={formData.purchaseSource || undefined}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      purchaseSource: value as "AUCTION" | "DEALER",
                      // Reset fields when source changes
                      auctionHouseId: "",
                      lotNo: "",
                      purchaseVendorId: "",
                      auctionSheetFile: null,
                      purchasePhotoFile: null,
                    }))
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select purchase source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUCTION">Auction</SelectItem>
                    <SelectItem value="DEALER">Dealer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Registration Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.isRegistered}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      isRegistered: value,
                    }))
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Registered</SelectItem>
                    <SelectItem value="false">Not Registered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <DatePicker
                  value={formData.purchaseDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      purchaseDate: e.target.value,
                    }))
                  }
                  placeholder="Select date"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Customer</Label>
                <Select
                  value={formData.customerId || "none"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      customerId: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select customer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Customer</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.customerId && (
                  <div className="mt-2 p-2 bg-muted/50 rounded-md text-sm">
                    <span className="text-muted-foreground">PIC: </span>
                    <span className="font-medium">
                      {customers.find((c) => c.id === formData.customerId)
                        ?.assignedTo?.name ||
                        customers.find((c) => c.id === formData.customerId)
                          ?.assignedTo?.email ||
                        "Not assigned"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Conditional fields based on purchase source */}
            {formData.purchaseSource === "AUCTION" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-sm">Auction Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Auction House <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.auctionHouseId || undefined}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          auctionHouseId: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select auction house" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Lot Number</Label>
                    <Input
                      value={formData.lotNo}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          lotNo: e.target.value,
                        }))
                      }
                      placeholder="Lot number at auction"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Auction Sheet Image</Label>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData((prev) => ({
                              ...prev,
                              auctionSheetFile: file,
                            }));
                          }
                        }}
                        className="h-11 flex-1"
                      />
                      <input
                        ref={auctionSheetCameraRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData((prev) => ({
                              ...prev,
                              auctionSheetFile: file,
                            }));
                          }
                        }}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => auctionSheetCameraRef.current?.click()}
                        className="h-11 shrink-0"
                        aria-label="Scan auction sheet with camera"
                      >
                        <span className="material-symbols-outlined text-lg">
                          document_scanner
                        </span>
                      </Button>
                    </div>
                    {formData.auctionSheetFile && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {formData.auctionSheetFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {formData.purchaseSource === "DEALER" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-sm">Dealer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Dealer/Vendor <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.purchaseVendorId || undefined}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          purchaseVendorId: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select or create vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {dealerships.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Purchase Photo</Label>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData((prev) => ({
                              ...prev,
                              purchasePhotoFile: file,
                            }));
                          }
                        }}
                        className="h-11 flex-1"
                      />
                      <input
                        ref={purchasePhotoCameraRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData((prev) => ({
                              ...prev,
                              purchasePhotoFile: file,
                            }));
                          }
                        }}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => purchasePhotoCameraRef.current?.click()}
                        className="h-11 shrink-0"
                        aria-label="Take purchase photo with camera"
                      >
                        <span className="material-symbols-outlined text-lg">
                          document_scanner
                        </span>
                      </Button>
                    </div>
                    {formData.purchasePhotoFile && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {formData.purchasePhotoFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading || uploading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateInvoice(true);
                  const form = document.querySelector("form");
                  if (form) {
                    form.requestSubmit();
                  }
                }}
                disabled={loading || uploading || !formData.customerId}
              >
                {loading || uploading
                  ? uploading
                    ? "Uploading..."
                    : "Creating..."
                  : "Create Vehicle & Invoice"}
              </Button>
              <Button type="submit" disabled={loading || uploading}>
                {loading || uploading
                  ? uploading
                    ? "Uploading..."
                    : "Creating..."
                  : "Create Vehicle"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
