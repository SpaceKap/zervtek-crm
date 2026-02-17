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
  getCountriesForPhonePicker,
  getCountriesSorted,
  getPhoneCodeForCountry,
  getUniquePhoneCodes,
} from "@/lib/countries-data";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { getRegionsForCountry, getRegionLabel } from "@/lib/address-data";
import {
  validatePostalCode,
  validateStateForCountry,
  getPostalPlaceholder,
} from "@/lib/address-validation";
import { validatePhoneNumber } from "@/lib/phone-validation";

const customerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z
      .string()
      .email("Valid email is required")
      .min(1, "Email is required"),
    phoneCountryCode: z.string().min(1, "Phone country code is required"),
    phoneNumber: z.string().min(1, "Phone number is required"),
    portOfDestination: z.string().min(1, "Port of destination is required"),
    address: z.object({
      street: z.string().min(1, "Street address is required"),
      apartment: z.string().min(1, "Apartment/suite is required"),
      city: z.string().min(1, "City is required"),
      state: z.string().min(1, "State/Province/Region is required"),
      zip: z.string().min(1, "ZIP/Postal code is required"),
      country: z.string().min(1, "Country/Region is required"),
    }),
    shippingAddress: z
      .object({
        street: z.string().optional(),
        apartment: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        country: z.string().optional(),
      })
      .optional(),
    sameAsBilling: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (!data.sameAsBilling) {
        if (!data.shippingAddress) return false;
        return (
          !!data.shippingAddress.street &&
          !!data.shippingAddress.apartment &&
          !!data.shippingAddress.city &&
          !!data.shippingAddress.state &&
          !!data.shippingAddress.zip &&
          !!data.shippingAddress.country
        );
      }
      return true;
    },
    {
      message:
        "All shipping address fields are required when shipping address is different",
      path: ["shippingAddress"],
    },
  )
  .superRefine((data, ctx) => {
    // Phone validation
    const phoneResult = validatePhoneNumber(
      data.phoneNumber,
      data.phoneCountryCode
    );
    if (!phoneResult.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: phoneResult.message,
        path: ["phoneNumber"],
      });
    }

    // Billing address - state and zip by country
    const country = data.address?.country;
    if (country) {
      const stateResult = validateStateForCountry(data.address!.state, country);
      if (!stateResult.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: stateResult.message,
          path: ["address", "state"],
        });
      }
      const zipResult = validatePostalCode(data.address!.zip, country);
      if (!zipResult.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: zipResult.message,
          path: ["address", "zip"],
        });
      }
    }

    // Shipping address - state and zip when different
    if (!data.sameAsBilling && data.shippingAddress?.country) {
      const shCountry = data.shippingAddress.country;
      const shStateResult = validateStateForCountry(
        data.shippingAddress.state || "",
        shCountry
      );
      if (!shStateResult.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: shStateResult.message,
          path: ["shippingAddress", "state"],
        });
      }
      const shZipResult = validatePostalCode(
        data.shippingAddress.zip || "",
        shCountry
      );
      if (!shZipResult.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: shZipResult.message,
          path: ["shippingAddress", "zip"],
        });
      }
    }
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
  onCustomerCreated?: (customer: { id: string; name: string }) => void;
}

const COUNTRY_CODES = getUniquePhoneCodes(); // for parsing existing phone
const PHONE_CODE_OPTIONS = getCountriesForPhonePicker(); // for dropdown with flags

// Get all countries sorted alphabetically
const COUNTRIES = getCountriesSorted();

interface User {
  id: string;
  name: string | null;
  email: string;
}

export function CustomerForm({
  customer,
  onClose,
  onCustomerCreated,
}: CustomerFormProps) {
  const [saving, setSaving] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [selectedShippingCountry, setSelectedShippingCountry] =
    useState<string>("");
  const [availableShippingRegions, setAvailableShippingRegions] = useState<
    string[]
  >([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assignedToId, setAssignedToId] = useState<string>("");

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
      shippingAddress: undefined,
      sameAsBilling: true,
    },
  });

  // Fetch users (excluding ACCOUNTANT role)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users?excludeRole=ACCOUNTANT");
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  // Parse existing customer data
  useEffect(() => {
    if (customer) {
      setAssignedToId((customer as any).assignedToId || "");
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

      const billingAddress = (customer.billingAddress as any) || {};
      const shippingAddress =
        (customer.shippingAddress as any) || billingAddress;
      const country = billingAddress.country || customer.country || "";
      const shippingCountry = shippingAddress.country || country;
      const sameAsBilling =
        JSON.stringify(billingAddress) === JSON.stringify(shippingAddress);

      reset({
        firstName,
        lastName,
        email: customer.email || "",
        phoneCountryCode,
        phoneNumber,
        portOfDestination: customer.portOfDestination || "",
        address: {
          street: billingAddress.street || "",
          apartment: billingAddress.apartment || "",
          city: billingAddress.city || "",
          state: billingAddress.state || "",
          zip: billingAddress.zip || "",
          country,
        },
        shippingAddress: {
          street: shippingAddress.street || "",
          apartment: shippingAddress.apartment || "",
          city: shippingAddress.city || "",
          state: shippingAddress.state || "",
          zip: shippingAddress.zip || "",
          country: shippingCountry,
        },
        sameAsBilling,
      });

      if (shippingCountry) {
        setSelectedShippingCountry(shippingCountry);
        setAvailableShippingRegions(getRegionsForCountry(shippingCountry));
      }

      setSelectedCountry(country);
      if (country) {
        setAvailableRegions(getRegionsForCountry(country));
      }
    }
  }, [customer, reset]);

  // Update regions when billing country changes; suggest phone code from address country
  useEffect(() => {
    const country = watch("address.country");
    if (country) {
      setSelectedCountry(country);
      const regions = getRegionsForCountry(country);
      setAvailableRegions(regions);
      if (regions.length === 0) {
        setValue("address.state", "");
      }
      // Suggest phone country code when address country is set and phone code is empty
      const phoneCode = watch("phoneCountryCode");
      if (!phoneCode) {
        const suggested = getPhoneCodeForCountry(country);
        if (suggested) setValue("phoneCountryCode", suggested);
      }
    } else {
      setSelectedCountry("");
      setAvailableRegions([]);
    }
  }, [watch("address.country"), setValue]);

  // Update regions when shipping country changes
  useEffect(() => {
    const country = watch("shippingAddress.country");
    if (country) {
      setSelectedShippingCountry(country);
      const regions = getRegionsForCountry(country);
      setAvailableShippingRegions(regions);
      // Clear state if regions change
      if (regions.length === 0) {
        setValue("shippingAddress.state", "");
      }
    } else {
      setSelectedShippingCountry("");
      setAvailableShippingRegions([]);
    }
  }, [watch("shippingAddress.country"), setValue]);

  // Handle "same as billing" checkbox
  const sameAsBilling = watch("sameAsBilling");
  useEffect(() => {
    if (sameAsBilling) {
      const billingAddress = watch("address");
      setValue("shippingAddress", { ...billingAddress });
      setSelectedShippingCountry(billingAddress.country || "");
      if (billingAddress.country) {
        setAvailableShippingRegions(
          getRegionsForCountry(billingAddress.country),
        );
      }
    }
  }, [sameAsBilling, watch("address"), setValue]);

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
        shippingAddress: data.sameAsBilling
          ? data.address
          : data.shippingAddress || data.address,
        portOfDestination: data.portOfDestination || null,
        assignedToId: assignedToId || null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        // If creating a new customer (not editing), call the callback
        if (!customer && onCustomerCreated) {
          onCustomerCreated({
            id: result.id,
            name: result.name,
          });
        }
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
                        Email{" "}
                        <span className="text-red-500 dark:text-red-400">
                          *
                        </span>
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
                        Phone Number{" "}
                        <span className="text-red-500 dark:text-red-400">
                          *
                        </span>
                      </Label>
                      <div className="flex gap-3">
                        <div className="min-w-[200px]">
                          <CountryCodeSelect
                            value={watch("phoneCountryCode") || ""}
                            onValueChange={(value) => {
                              setValue("phoneCountryCode", value, {
                                shouldValidate: true,
                              });
                            }}
                            options={PHONE_CODE_OPTIONS}
                            placeholder="Select country code"
                            className="h-10 w-full"
                          />
                          {errors.phoneCountryCode && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                              {errors.phoneCountryCode.message}
                            </p>
                          )}
                        </div>
                        <div className="flex-1">
                          <Input
                            id="phone"
                            type="tel"
                            inputMode="numeric"
                            {...register("phoneNumber")}
                            placeholder="e.g. 5551234567"
                            className="h-10"
                          />
                          {errors.phoneNumber && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                              {errors.phoneNumber.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Port of Destination */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="portOfDestination"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Port of Destination{" "}
                        <span className="text-red-500 dark:text-red-400">
                          *
                        </span>
                      </Label>
                      <Input
                        id="portOfDestination"
                        {...register("portOfDestination")}
                        placeholder="e.g., Port of Los Angeles, Port of Tokyo"
                        className="h-10"
                      />
                      {errors.portOfDestination && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                          {errors.portOfDestination.message}
                        </p>
                      )}
                    </div>

                    {/* Person In Charge (PIC) */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="assignedToId"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Person In Charge (PIC)
                      </Label>
                      <Select
                        value={assignedToId || "none"}
                        onValueChange={(value) =>
                          setAssignedToId(value === "none" ? "" : value)
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not Assigned</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        Country/Region{" "}
                        <span className="text-red-500 dark:text-red-400">
                          *
                        </span>
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
                      {errors.address?.country && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                          {errors.address.country.message}
                        </p>
                      )}
                    </div>

                    {/* Street Address */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="addressStreet"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Street address{" "}
                        <span className="text-red-500 dark:text-red-400">
                          *
                        </span>
                      </Label>
                      <Input
                        id="addressStreet"
                        {...register("address.street")}
                        placeholder="Street address"
                        className="h-10"
                      />
                      {errors.address?.street && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                          {errors.address.street.message}
                        </p>
                      )}
                    </div>

                    {/* Apartment */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="addressApartment"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Apartment, suite, etc.{" "}
                        <span className="text-red-500 dark:text-red-400">
                          *
                        </span>
                      </Label>
                      <Input
                        id="addressApartment"
                        {...register("address.apartment")}
                        placeholder="Apartment, suite, etc."
                        className="h-10"
                      />
                      {errors.address?.apartment && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                          {errors.address.apartment.message}
                        </p>
                      )}
                    </div>

                    {/* City & State */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="addressCity"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          City{" "}
                          <span className="text-red-500 dark:text-red-400">
                            *
                          </span>
                        </Label>
                        <Input
                          id="addressCity"
                          {...register("address.city")}
                          placeholder="City"
                          className="h-10"
                        />
                        {errors.address?.city && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                            {errors.address.city.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="addressState"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          State/Province/Region{" "}
                          <span className="text-red-500 dark:text-red-400">
                            *
                          </span>
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
                        {errors.address?.state && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                            {errors.address.state.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ZIP/Postal Code */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="addressZip"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        ZIP/Postal Code{" "}
                        <span className="text-red-500 dark:text-red-400">
                          *
                        </span>
                      </Label>
                      <Input
                        id="addressZip"
                        {...register("address.zip")}
                        placeholder={getPostalPlaceholder(
                          watch("address.country") || "",
                        )}
                        className="h-10"
                      />
                      {errors.address?.zip && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                          {errors.address.zip.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address Section */}
            {!sameAsBilling && (
              <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="grid grid-cols-2 gap-8">
                  {/* Left Column - Empty (matching billing layout) */}
                  <div className="space-y-0"></div>

                  {/* Right Column - Shipping Address */}
                  <div className="space-y-0">
                    <div className="mb-6">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-6">
                        Shipping Address
                      </h3>
                      <div className="space-y-5">
                        {/* Country/Region */}
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="shippingAddressCountry"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Country/Region{" "}
                            <span className="text-red-500 dark:text-red-400">
                              *
                            </span>
                          </Label>
                          <Select
                            value={watch("shippingAddress.country") || ""}
                            onValueChange={(value) => {
                              setValue("shippingAddress.country", value);
                              setValue("shippingAddress.state", "");
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
                          {errors.shippingAddress?.country && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                              {errors.shippingAddress.country.message}
                            </p>
                          )}
                        </div>

                        {/* Street Address */}
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="shippingAddressStreet"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Street address{" "}
                            <span className="text-red-500 dark:text-red-400">
                              *
                            </span>
                          </Label>
                          <Input
                            id="shippingAddressStreet"
                            {...register("shippingAddress.street")}
                            placeholder="Street address"
                            className="h-10"
                          />
                          {errors.shippingAddress?.street && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                              {errors.shippingAddress.street.message}
                            </p>
                          )}
                        </div>

                        {/* Apartment */}
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="shippingAddressApartment"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Apartment, suite, etc.{" "}
                            <span className="text-red-500 dark:text-red-400">
                              *
                            </span>
                          </Label>
                          <Input
                            id="shippingAddressApartment"
                            {...register("shippingAddress.apartment")}
                            placeholder="Apartment, suite, etc."
                            className="h-10"
                          />
                          {errors.shippingAddress?.apartment && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                              {errors.shippingAddress.apartment.message}
                            </p>
                          )}
                        </div>

                        {/* City & State */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="shippingAddressCity"
                              className="text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                              City{" "}
                              <span className="text-red-500 dark:text-red-400">
                                *
                              </span>
                            </Label>
                            <Input
                              id="shippingAddressCity"
                              {...register("shippingAddress.city")}
                              placeholder="City"
                              className="h-10"
                            />
                            {errors.shippingAddress?.city && (
                              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                                {errors.shippingAddress.city.message}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="shippingAddressState"
                              className="text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                              State/Province/Region{" "}
                              <span className="text-red-500 dark:text-red-400">
                                *
                              </span>
                            </Label>
                            {availableShippingRegions.length > 0 ? (
                              <Select
                                value={watch("shippingAddress.state") || ""}
                                onValueChange={(value) =>
                                  setValue("shippingAddress.state", value)
                                }
                              >
                                <SelectTrigger className="h-10">
                                  <SelectValue
                                    placeholder={`Select ${getRegionLabel(selectedShippingCountry).toLowerCase()}`}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableShippingRegions.map((region) => (
                                    <SelectItem key={region} value={region}>
                                      {region}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                id="shippingAddressState"
                                {...register("shippingAddress.state")}
                                placeholder={getRegionLabel(
                                  selectedShippingCountry,
                                )}
                                className="h-10"
                              />
                            )}
                            {errors.shippingAddress?.state && (
                              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                                {errors.shippingAddress.state.message}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* ZIP/Postal Code */}
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="shippingAddressZip"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            ZIP/Postal Code{" "}
                            <span className="text-red-500 dark:text-red-400">
                              *
                            </span>
                          </Label>
                          <Input
                            id="shippingAddressZip"
                            {...register("shippingAddress.zip")}
                            placeholder={getPostalPlaceholder(
                              watch("shippingAddress.country") || "",
                            )}
                            className="h-10"
                          />
                          {errors.shippingAddress?.zip && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                              {errors.shippingAddress.zip.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Checkbox for shipping address */}
            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sameAsBilling"
                  {...register("sameAsBilling")}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Label
                  htmlFor="sameAsBilling"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Shipping address is the same
                </Label>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
