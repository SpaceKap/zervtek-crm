"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "@/lib/countries-data";
import { getRegionsForCountry, getRegionLabel } from "@/lib/address-data";
import { getPostalPlaceholder } from "@/lib/address-validation";
import { validatePhoneNumber } from "@/lib/phone-validation";

const COUNTRIES = getCountriesSorted();
const PHONE_OPTIONS = getCountriesForPhonePicker();

const HOW_FOUND_US_OPTIONS = [
  { value: "JCT", label: "Japanese Car Trade (JCT)" },
  { value: "SEARCH_ENGINE", label: "Search Engine (Google, Yahoo, etc.)" },
  { value: "SOCIAL_MEDIA", label: "Social Media (Facebook, Instagram, etc.)" },
  { value: "REFERRAL", label: "Referral" },
  { value: "WEBSITE", label: "Website / Contact form" },
  { value: "TRADE_SHOW", label: "Trade show / Event" },
  { value: "OTHER", label: "Other" },
] as const;

interface StaffOption {
  id: string;
  displayName: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<StaffOption[]>([]);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phoneCountryCode: "",
    phoneNumber: "",
    country: "",
    address: {
      street: "",
      apartment: "",
      city: "",
      state: "",
      zip: "",
      country: "",
    },
    sameAsBilling: true,
    shippingAddress: {
      street: "",
      apartment: "",
      city: "",
      state: "",
      zip: "",
      country: "",
    },
    howFoundUs: "",
    assignedToId: "" as string | null,
  });

  useEffect(() => {
    fetch("/api/staff")
      .then((r) => r.ok ? r.json() : [])
      .then(setStaff)
      .catch(() => setStaff([]));
  }, []);

  useEffect(() => {
    if (form.country && !form.phoneCountryCode) {
      const code = getPhoneCodeForCountry(form.country);
      if (code) setForm((f) => ({ ...f, phoneCountryCode: code }));
    }
  }, [form.country]);

  const update = (key: string, value: unknown) => {
    setForm((prev) => {
      const next = { ...prev };
      if (key.includes(".")) {
        const [a, b] = key.split(".");
        (next as any)[a] = { ...(next as any)[a], [b]: value };
      } else {
        (next as any)[key] = value;
      }
      return next;
    });
  };

  const validateStep1 = (): string | null => {
    if (!form.firstName?.trim()) return "First name is required.";
    if (!form.lastName?.trim()) return "Last name is required.";
    if (!form.email?.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Enter a valid email.";
    if (!form.password || form.password.length < 8) return "Password must be at least 8 characters.";
    if (!form.country?.trim()) return "Country is required.";
    if (!form.phoneCountryCode?.trim()) return "Phone country code is required.";
    if (!form.phoneNumber?.trim()) return "Phone number is required.";
    const phoneResult = validatePhoneNumber(form.phoneNumber, form.phoneCountryCode);
    if (!phoneResult.valid) return phoneResult.message;
    return null;
  };

  const validateStep2 = (): string | null => {
    const a = form.address;
    const country = a.country?.trim() || form.country?.trim();
    if (!country) return "Country/Region is required.";
    if (!a.street?.trim()) return "Street address is required.";
    if (!a.city?.trim()) return "City is required.";
    if (!a.state?.trim()) return "State/Province/Region is required.";
    if (!a.zip?.trim()) return "ZIP/Postal code is required.";
    return null;
  };

  const validateStep3 = (): string | null => {
    if (!form.howFoundUs?.trim()) return "Please select how you found us.";
    return null;
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setError(err);
        return;
      }
      setForm((f) => ({
        ...f,
        address: { ...f.address, country: f.address.country || f.country },
      }));
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) {
        setError(err);
        return;
      }
      if (form.sameAsBilling) {
        setForm((f) => ({
          ...f,
          shippingAddress: { ...f.address },
        }));
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const err = step === 3 ? validateStep3() : null;
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    try {
      const billingAddress = {
        street: form.address.street,
        apartment: form.address.apartment || undefined,
        city: form.address.city,
        state: form.address.state,
        zip: form.address.zip,
        country: form.address.country || form.country,
      };
      const shippingAddress = form.sameAsBilling
        ? billingAddress
        : {
            street: form.shippingAddress.street,
            apartment: form.shippingAddress.apartment || undefined,
            city: form.shippingAddress.city,
            state: form.shippingAddress.state,
            zip: form.shippingAddress.zip,
            country: form.shippingAddress.country,
          };
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
          phoneCountryCode: form.phoneCountryCode,
          phoneNumber: form.phoneNumber.trim(),
          country: form.country.trim(),
          billingAddress,
          shippingAddress,
          sameAsBilling: form.sameAsBilling,
          howFoundUs: form.howFoundUs || undefined,
          assignedToId: form.assignedToId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        setLoading(false);
        return;
      }
      router.push("/login?registered=1");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  const regionLabel = getRegionLabel(form.address.country || form.country);
  const addressRegions = getRegionsForCountry(form.address.country || form.country);
  const shippingRegions = getRegionsForCountry(form.shippingAddress.country);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Car className="size-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Register to view your vehicles and track shipping
          </CardDescription>
          <div className="flex justify-center gap-2 pt-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-2 rounded-full ${step === s ? "bg-primary" : "bg-muted-foreground/30"}`}
                aria-hidden
              />
            ))}
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name *</Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => update("firstName", e.target.value)}
                      placeholder="First name"
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name *</Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => update("lastName", e.target.value)}
                      placeholder="Last name"
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country *</Label>
                  <Select
                    value={form.country}
                    onValueChange={(v) => update("country", v)}
                    required
                  >
                    <SelectTrigger className="w-full">
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
                <div className="space-y-2">
                  <Label>Phone number *</Label>
                  <div className="grid grid-cols-[minmax(0,180px)_1fr] gap-3">
                    <CountryCodeSelect
                      value={form.phoneCountryCode}
                      onValueChange={(v) => update("phoneCountryCode", v)}
                      options={PHONE_OPTIONS}
                      placeholder="Code"
                      className="h-10 w-full min-w-0"
                    />
                    <Input
                      type="tel"
                      inputMode="numeric"
                      value={form.phoneNumber}
                      onChange={(e) => update("phoneNumber", e.target.value)}
                      placeholder="e.g. 5551234567"
                      className="h-10"
                      autoComplete="tel-national"
                    />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Country/Region *</Label>
                  <Select
                    value={form.address.country || form.country}
                    onValueChange={(v) => update("address.country", v)}
                  >
                    <SelectTrigger className="w-full">
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
                <div className="space-y-2">
                  <Label>Street address *</Label>
                  <Input
                    value={form.address.street}
                    onChange={(e) => update("address.street", e.target.value)}
                    placeholder="Street address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apartment, suite, etc.</Label>
                  <Input
                    value={form.address.apartment}
                    onChange={(e) => update("address.apartment", e.target.value)}
                    placeholder="Apartment, suite, etc."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input
                      value={form.address.city}
                      onChange={(e) => update("address.city", e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{regionLabel} *</Label>
                    {addressRegions.length > 0 ? (
                      <Select
                        value={form.address.state}
                        onValueChange={(v) => update("address.state", v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={`Select ${regionLabel.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {addressRegions.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={form.address.state}
                        onChange={(e) => update("address.state", e.target.value)}
                        placeholder={regionLabel}
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ZIP/Postal code *</Label>
                  <Input
                    value={form.address.zip}
                    onChange={(e) => update("address.zip", e.target.value)}
                    placeholder={getPostalPlaceholder(form.address.country || form.country)}
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label>How did you find us? *</Label>
                  <Select
                    value={form.howFoundUs}
                    onValueChange={(v) => update("howFoundUs", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {HOW_FOUND_US_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Person in charge (optional)</Label>
                  <Select
                    value={form.assignedToId ?? "none"}
                    onValueChange={(v) => update("assignedToId", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="flex gap-2 w-full">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                  Back
                </Button>
              )}
              {step < 3 ? (
                <Button type="button" onClick={handleNext} className="flex-1">
                  Next
                </Button>
              ) : (
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Creating account…" : "Register"}
                </Button>
              )}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
