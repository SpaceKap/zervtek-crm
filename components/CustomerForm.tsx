"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  COUNTRIES_DATA,
  getUniquePhoneCodes,
  getCountriesSorted,
} from "@/lib/countries-data";
import { getRegionsForCountry, getRegionLabel } from "@/lib/address-data";

const customerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phoneCountryCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  portOfDestination: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    apartment: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    country: string | null;
    billingAddress: any;
    shippingAddress: any;
    portOfDestination: string | null;
  } | null;
  onClose: () => void;
}

// Get phone codes (grouped by code, as some countries share codes)
const COUNTRY_CODES = getUniquePhoneCodes();

// Get all countries sorted alphabetically
const COUNTRIES = getCountriesSorted();

export function CustomerForm({ customer, onClose }: CustomerFormProps) {
  const [saving, setSaving] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: customer?.email || "",
      phoneCountryCode: "",
      phoneNumber: "",
      portOfDestination: customer?.portOfDestination || "",
      address: {
        street: "",
        apartment: "",
        city: "",
        state: "",
        zip: "",
        country: "",
      },
    },
  });

  // Parse existing customer data
  useEffect(() => {
    if (customer) {
      // Parse name into first and last
      const nameParts = (customer.name || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Parse phone
      let phoneCountryCode = "";
      let phoneNumber = "";
      if (customer.phone) {
        const phone = customer.phone.trim();
        if (phone.startsWith("+")) {
          const sortedCodes = [...COUNTRY_CODES].sort(
            (a, b) => b.code.length - a.code.length,
          );
          const matchedCode = sortedCodes.find((cc) =>
            phone.startsWith(cc.code),
          );
          if (matchedCode) {
            phoneCountryCode = matchedCode.code;
            phoneNumber = phone.replace(matchedCode.code, "").trim();
          } else {
            phoneNumber = phone;
          }
        } else {
          phoneNumber = phone;
        }
      }

      const address = (customer.billingAddress as any) || {};
      const country = address.country || customer.country || "";

      reset({
        firstName,
        lastName,
        email: customer.email || "",
        phoneCountryCode,
        phoneNumber,
        portOfDestination: customer.portOfDestination || "",
        address: {
          street: address.street || "",
          apartment: address.apartment || "",
          city: address.city || "",
          state: address.state || "",
          zip: address.zip || "",
          country,
        },
      });

      setSelectedCountry(country);
      if (country) {
        setAvailableRegions(getRegionsForCountry(country));
      }
    }
  }, [customer, reset]);

  // Update regions when country changes
  useEffect(() => {
    const country = watch("address.country");
    if (country) {
      setSelectedCountry(country);
      const regions = getRegionsForCountry(country);
      setAvailableRegions(regions);
      // Clear state if regions change
      if (regions.length === 0) {
        setValue("address.state", "");
      }
    } else {
      setSelectedCountry("");
      setAvailableRegions([]);
    }
  }, [watch("address.country"), setValue]);

  const handleClose = () => {
    reset();
    setSelectedCountry("");
    setAvailableRegions([]);
    onClose();
  };

  const onSubmit = async (data: CustomerFormData) => {
    setSaving(true);
    try {
      const url = customer ? `/api/customers/${customer.id}` : "/api/customers";
      const method = customer ? "PATCH" : "POST";

      // Combine first and last name
      const name = `${data.firstName} ${data.lastName}`.trim();

      // Combine phone country code and number
      const phone =
        data.phoneCountryCode && data.phoneNumber
          ? `${data.phoneCountryCode} ${data.phoneNumber}`.trim()
          : data.phoneNumber || null;

      const payload = {
        name,
        email: data.email || null,
        phone,
        country: data.address.country || null,
        billingAddress: data.address,
        shippingAddress: data.address, // Use same address for both
        portOfDestination: data.portOfDestination || null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        handleClose();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error saving customer:", error);
      alert("Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const regionLabel = getRegionLabel(selectedCountry);

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {customer ? "Edit Customer" : "New Customer"}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
                {customer
                  ? "Update customer information"
                  : "Add a new customer to your system"}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="h-9 px-4"
              >
                Discard
              </Button>
              <Button
                type="submit"
                form="customer-form"
                disabled={saving}
                className="h-9 px-4"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form
            id="customer-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-0"
          >
            <div className="grid grid-cols-2 gap-8">
              {/* Left Column - Customer Overview */}
              <div className="space-y-0">
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-6">
                    Customer Overview
                  </h3>
                  <div className="space-y-5">
                    {/* First Name & Last Name */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="firstName"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          First name{" "}
                          <span className="text-red-500 dark:text-red-400">
                            *
                          </span>
                        </Label>
                        <Input
                          id="firstName"
                          {...register("firstName")}
                          placeholder="First name"
                          className="h-10"
                        />
                        {errors.firstName && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                            {errors.firstName.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="lastName"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Last name{" "}
                          <span className="text-red-500 dark:text-red-400">
                            *
                          </span>
                        </Label>
                        <Input
                          id="lastName"
                          {...register("lastName")}
                          placeholder="Last name"
                          className="h-10"
                        />
                        {errors.lastName && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                            {errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="email"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        {...register("email")}
                        placeholder="email@example.com"
                        className="h-10"
                      />
                      {errors.email && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="phone"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Phone Number
                      </Label>
                      <div className="flex gap-3">
                        <Select
                          value={watch("phoneCountryCode") || ""}
                          onValueChange={(value) =>
                            setValue("phoneCountryCode", value)
                          }
                        >
                          <SelectTrigger className="w-[150px] h-10">
                            <SelectValue placeholder="Code" />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRY_CODES.map((cc) => (
                              <SelectItem key={cc.code} value={cc.code}>
                                {cc.code}{" "}
                                {cc.countries.length > 1
                                  ? `(${cc.countries[0]}...)`
                                  : `(${cc.countries[0]})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          id="phone"
                          type="tel"
                          {...register("phoneNumber")}
                          placeholder="Phone number"
                          className="flex-1 h-10"
                        />
                      </div>
                    </div>

                    {/* Port of Destination */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="portOfDestination"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Port of Destination
                      </Label>
                      <Input
                        id="portOfDestination"
                        {...register("portOfDestination")}
                        placeholder="e.g., Port of Los Angeles, Port of Tokyo"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Address */}
              <div className="space-y-0">
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-6">
                    Address
                  </h3>
                  <div className="space-y-5">
                    {/* Country/Region */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="addressCountry"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Country/Region
                      </Label>
                      <Select
                        value={watch("address.country") || ""}
                        onValueChange={(value) => {
                          setValue("address.country", value);
                          setValue("address.state", ""); // Clear state when country changes
                        }}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Street Address */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="addressStreet"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Address
                      </Label>
                      <Input
                        id="addressStreet"
                        {...register("address.street")}
                        placeholder="Street address"
                        className="h-10"
                      />
                    </div>

                    {/* Apartment */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="addressApartment"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Apartment, suite, etc.
                      </Label>
                      <Input
                        id="addressApartment"
                        {...register("address.apartment")}
                        placeholder="Apartment, suite, etc."
                        className="h-10"
                      />
                    </div>

                    {/* City & State */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="addressCity"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          City
                        </Label>
                        <Input
                          id="addressCity"
                          {...register("address.city")}
                          placeholder="City"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="addressState"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          {regionLabel}
                        </Label>
                        {availableRegions.length > 0 ? (
                          <Select
                            value={watch("address.state") || ""}
                            onValueChange={(value) =>
                              setValue("address.state", value)
                            }
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue
                                placeholder={`Select ${regionLabel.toLowerCase()}`}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRegions.map((region) => (
                                <SelectItem key={region} value={region}>
                                  {region}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="addressState"
                            {...register("address.state")}
                            placeholder={regionLabel}
                            className="h-10"
                          />
                        )}
                      </div>
                    </div>

                    {/* ZIP/Postal Code */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="addressZip"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        ZIP/Postal Code
                      </Label>
                      <Input
                        id="addressZip"
                        {...register("address.zip")}
                        placeholder="ZIP/Postal code"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
