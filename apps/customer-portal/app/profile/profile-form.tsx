"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import {
  getCountriesForPhonePicker,
  getCountriesSorted,
  getPhoneCodeForCountry,
  getUniquePhoneCodes,
} from "@/lib/countries-data";
import { getRegionsForCountry, getRegionLabel } from "@/lib/address-data";
import {
  validatePostalCode,
  validateStateForCountry,
  getPostalPlaceholder,
} from "@/lib/address-validation";
import { validatePhoneNumber } from "@/lib/phone-validation";

const profileSchema = z
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
      apartment: z.string().optional(),
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
    sameAsBilling: z.boolean(),
  })
  .refine(
    (data) => {
      if (!data.sameAsBilling && data.shippingAddress) {
        return (
          !!data.shippingAddress.street &&
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
    }
  )
  .superRefine((data, ctx) => {
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

type ProfileFormData = z.infer<typeof profileSchema>;

const COUNTRY_CODES = getUniquePhoneCodes();
const PHONE_CODE_OPTIONS = getCountriesForPhonePicker();
const COUNTRIES = getCountriesSorted();

type Profile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  billingAddress: {
    street?: string;
    apartment?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  shippingAddress: {
    street?: string;
    apartment?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  portOfDestination: string | null;
};

export function ProfileForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [selectedShippingCountry, setSelectedShippingCountry] = useState("");
  const [availableShippingRegions, setAvailableShippingRegions] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneCountryCode: "",
      phoneNumber: "",
      portOfDestination: "",
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

  useEffect(() => {
    fetch("/api/profile", { credentials: "include" })
      .then((r) => {
        if (!r.ok)
          return r.json().then((d) =>
            Promise.reject(new Error(d?.error ?? "Failed to load profile"))
          );
        return r.json();
      })
      .then((data: Profile) => {
        const nameParts = (data.name || "").trim().split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        let phoneCountryCode = "";
        let phoneNumber = "";
        if (data.phone) {
          const phone = data.phone.trim();
          if (phone.startsWith("+")) {
            const sortedCodes = [...COUNTRY_CODES].sort(
              (a, b) => b.code.length - a.code.length
            );
            const matchedCode = sortedCodes.find((cc) =>
              phone.startsWith(cc.code)
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

        const billingAddress = data.billingAddress || {};
        const shippingAddress = data.shippingAddress || billingAddress;
        const country = billingAddress.country || data.country || "";
        const shippingCountry = (shippingAddress as any).country || country;
        const sameAsBilling =
          JSON.stringify(billingAddress) === JSON.stringify(shippingAddress);

        reset({
          firstName,
          lastName,
          email: data.email ?? "",
          phoneCountryCode,
          phoneNumber,
          portOfDestination: data.portOfDestination ?? "",
          address: {
            street: billingAddress.street ?? "",
            apartment: billingAddress.apartment ?? "",
            city: billingAddress.city ?? "",
            state: billingAddress.state ?? "",
            zip: billingAddress.zip ?? "",
            country,
          },
          shippingAddress: {
            street: (shippingAddress as any).street ?? "",
            apartment: (shippingAddress as any).apartment ?? "",
            city: (shippingAddress as any).city ?? "",
            state: (shippingAddress as any).state ?? "",
            zip: (shippingAddress as any).zip ?? "",
            country: shippingCountry,
          },
          sameAsBilling,
        });

        setSelectedCountry(country);
        if (country) setAvailableRegions(getRegionsForCountry(country));
        setSelectedShippingCountry(shippingCountry);
        if (shippingCountry)
          setAvailableShippingRegions(getRegionsForCountry(shippingCountry));
      })
      .catch(() => setLoadError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [reset, setValue]);

  useEffect(() => {
    const country = watch("address.country");
    if (country) {
      setSelectedCountry(country);
      const regions = getRegionsForCountry(country);
      setAvailableRegions(regions);
      if (regions.length === 0) setValue("address.state", "");
      const phoneCode = watch("phoneCountryCode");
      if (!phoneCode) {
        const suggested = getPhoneCodeForCountry(country);
        if (suggested) setValue("phoneCountryCode", suggested);
      }
    } else {
      setSelectedCountry("");
      setAvailableRegions([]);
    }
  }, [watch("address.country"), setValue, watch("phoneCountryCode")]);

  useEffect(() => {
    const country = watch("shippingAddress.country");
    if (country) {
      setSelectedShippingCountry(country);
      const regions = getRegionsForCountry(country);
      setAvailableShippingRegions(regions);
      if (regions.length === 0) setValue("shippingAddress.state", "");
    } else {
      setSelectedShippingCountry("");
      setAvailableShippingRegions([]);
    }
  }, [watch("shippingAddress.country"), setValue]);

  const sameAsBilling = watch("sameAsBilling");
  useEffect(() => {
    if (sameAsBilling) {
      const billingAddress = watch("address");
      setValue("shippingAddress", { ...billingAddress });
      setSelectedShippingCountry(billingAddress.country || "");
      if (billingAddress.country) {
        setAvailableShippingRegions(
          getRegionsForCountry(billingAddress.country)
        );
      }
    }
  }, [sameAsBilling, watch("address"), setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    setSaved(false);
    setSubmitError(null);
    try {
      const name = `${data.firstName} ${data.lastName}`.trim();
      const phone =
        data.phoneCountryCode && data.phoneNumber
          ? `${data.phoneCountryCode} ${data.phoneNumber}`.trim()
          : data.phoneNumber || null;

      const payload = {
        name,
        email: data.email || null,
        phone,
        country: data.address.country || null,
        portOfDestination: data.portOfDestination || null,
        billingAddress: data.address,
        shippingAddress: data.sameAsBilling
          ? data.address
          : data.shippingAddress || data.address,
      };

      const res = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d?.error ?? "Failed to update");
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const regionLabel = getRegionLabel(selectedCountry);

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (loadError) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {loadError}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-0 max-w-2xl">
      {submitError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive mb-4">
          {submitError}
        </p>
      )}
      {saved && (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 mb-4">
          Changes saved successfully.
        </p>
      )}

      <section className="mb-8">
        <h3 className="text-base font-semibold mb-5">Customer Overview</h3>
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">
                First name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                {...register("firstName")}
                placeholder="First name"
                className="h-10"
              />
              {errors.firstName && (
                <p className="text-xs text-destructive mt-1">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">
                Last name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                {...register("lastName")}
                placeholder="Last name"
                className="h-10"
              />
              {errors.lastName && (
                <p className="text-xs text-destructive mt-1">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="email@example.com"
              className="h-10"
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-[minmax(0,180px)_minmax(0,1fr)] gap-3">
              <CountryCodeSelect
                value={watch("phoneCountryCode") || ""}
                onValueChange={(v) =>
                  setValue("phoneCountryCode", v, { shouldValidate: true })
                }
                options={PHONE_CODE_OPTIONS}
                placeholder="Code"
                className="h-10 w-full min-w-0"
              />
              <Input
                type="tel"
                inputMode="numeric"
                {...register("phoneNumber")}
                placeholder="e.g. 5551234567"
                className="h-10 w-full min-w-0"
              />
            </div>
            {errors.phoneCountryCode && (
              <p className="text-xs text-destructive mt-1">
                {errors.phoneCountryCode.message}
              </p>
            )}
            {errors.phoneNumber && (
              <p className="text-xs text-destructive mt-1">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portOfDestination">
              Port of Destination <span className="text-destructive">*</span>
            </Label>
            <Input
              id="portOfDestination"
              {...register("portOfDestination")}
              placeholder="e.g. Port of Tokyo, Los Angeles"
              className="h-10"
            />
            {errors.portOfDestination && (
              <p className="text-xs text-destructive mt-1">
                {errors.portOfDestination.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Person In Charge (PIC)</Label>
            <p className="text-sm text-muted-foreground">Not Assigned</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-base font-semibold mb-5">Address</h3>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Country/Region *</Label>
            <Select
              value={watch("address.country") || ""}
              onValueChange={(v) => {
                setValue("address.country", v);
                setValue("address.state", "");
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.address?.country && (
              <p className="text-xs text-destructive mt-1">
                {errors.address.country.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Street address *</Label>
            <Input
              {...register("address.street")}
              placeholder="Street address"
              className="h-10"
            />
            {errors.address?.street && (
              <p className="text-xs text-destructive mt-1">
                {errors.address.street.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Apartment, suite, etc. *</Label>
            <Input
              {...register("address.apartment")}
              placeholder="Apartment, suite, etc."
              className="h-10"
            />
            {errors.address?.apartment && (
              <p className="text-xs text-destructive mt-1">
                {errors.address.apartment.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>City *</Label>
              <Input
                {...register("address.city")}
                placeholder="City"
                className="h-10"
              />
              {errors.address?.city && (
                <p className="text-xs text-destructive mt-1">
                  {errors.address.city.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>State/Province/Region *</Label>
              {availableRegions.length > 0 ? (
                <Select
                  value={watch("address.state") || ""}
                  onValueChange={(v) => setValue("address.state", v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue
                      placeholder={`Select ${regionLabel.toLowerCase()}`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRegions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  {...register("address.state")}
                  placeholder={regionLabel}
                  className="h-10"
                />
              )}
              {errors.address?.state && (
                <p className="text-xs text-destructive mt-1">
                  {errors.address.state.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>ZIP/Postal Code *</Label>
            <Input
              {...register("address.zip")}
              placeholder={getPostalPlaceholder(watch("address.country") || "")}
              className="h-10"
            />
            {errors.address?.zip && (
              <p className="text-xs text-destructive mt-1">
                {errors.address.zip.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {!sameAsBilling && (
        <section className="mb-8 border-t pt-6">
          <h3 className="text-base font-semibold mb-5">Shipping Address</h3>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>Country/Region *</Label>
              <Select
                value={watch("shippingAddress.country") || ""}
                onValueChange={(v) => {
                  setValue("shippingAddress.country", v);
                  setValue("shippingAddress.state", "");
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Street address *</Label>
              <Input
                {...register("shippingAddress.street")}
                placeholder="Street address"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Apartment, suite, etc. *</Label>
              <Input
                {...register("shippingAddress.apartment")}
                placeholder="Apartment, suite, etc."
                className="h-10"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>City *</Label>
                <Input
                  {...register("shippingAddress.city")}
                  placeholder="City"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label>State/Province/Region *</Label>
                {availableShippingRegions.length > 0 ? (
                  <Select
                    value={watch("shippingAddress.state") || ""}
                    onValueChange={(v) =>
                      setValue("shippingAddress.state", v)
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue
                        placeholder={`Select ${getRegionLabel(selectedShippingCountry).toLowerCase()}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableShippingRegions.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    {...register("shippingAddress.state")}
                    placeholder={getRegionLabel(selectedShippingCountry)}
                    className="h-10"
                  />
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ZIP/Postal Code *</Label>
              <Input
                {...register("shippingAddress.zip")}
                placeholder={getPostalPlaceholder(
                  watch("shippingAddress.country") || ""
                )}
                className="h-10"
              />
            </div>
          </div>
        </section>
      )}

      <div className="flex items-center space-x-2 pt-6 border-t">
        <input
          type="checkbox"
          id="sameAsBilling"
          {...register("sameAsBilling")}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="sameAsBilling" className="cursor-pointer">
          Shipping address is the same
        </Label>
      </div>

      <div className="mt-8 pt-6 border-t flex justify-end">
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  );
}
