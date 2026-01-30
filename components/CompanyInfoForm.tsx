"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const bankDetailsSchema = z.object({
  name: z.string().optional(),
  swiftCode: z.string().optional(),
  branchName: z.string().optional(),
  accountNo: z.string().optional(),
  bankAddress: z.string().optional(),
  accountName: z.string().optional(),
});

const companyInfoSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  logo: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  website: z.string().url().nullable().optional().or(z.literal("")),
  taxId: z.string().nullable().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  bankDetails1: bankDetailsSchema.optional().nullable(),
  bankDetails2: bankDetailsSchema.optional().nullable(),
});

type CompanyInfoFormData = z.infer<typeof companyInfoSchema>;

export function CompanyInfoForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfoFormData | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CompanyInfoFormData>({
    resolver: zodResolver(companyInfoSchema),
  });

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch("/api/company");
      if (response.ok) {
        const data = await response.json();
        const address = (data.address as any) || {
          street: "",
          city: "",
          state: "",
          zip: "",
          country: "",
        };
        const bankDetails1 = (data.bankDetails1 as any) || {
          name: "",
          swiftCode: "",
          branchName: "",
          accountNo: "",
          bankAddress: "",
          accountName: "",
        };
        const bankDetails2 = (data.bankDetails2 as any) || {
          name: "",
          swiftCode: "",
          branchName: "",
          accountNo: "",
          bankAddress: "",
          accountName: "",
        };
        setCompanyInfo({ ...data, address, bankDetails1, bankDetails2 });
        reset({ ...data, address, bankDetails1, bankDetails2 });
      }
    } catch (error) {
      console.error("Error fetching company info:", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CompanyInfoFormData) => {
    setSaving(true);
    try {
      // Ensure all fields are properly formatted
      const payload: any = {
        name: data.name,
      };

      // Only include fields that are defined, handle empty strings as null
      if (data.logo !== undefined) {
        payload.logo = data.logo === "" ? null : data.logo;
      }
      if (data.phone !== undefined) {
        payload.phone = data.phone === "" ? null : data.phone;
      }
      if (data.email !== undefined) {
        payload.email = data.email === "" ? null : data.email;
      }
      if (data.website !== undefined) {
        payload.website = data.website === "" ? null : data.website;
      }
      if (data.taxId !== undefined) {
        payload.taxId = data.taxId === "" ? null : data.taxId;
      }
      if (data.address !== undefined) {
        payload.address = data.address || {};
      }
      if (data.bankDetails1 !== undefined) {
        payload.bankDetails1 = data.bankDetails1 || {};
      }
      if (data.bankDetails2 !== undefined) {
        payload.bankDetails2 = data.bankDetails2 || {};
      }

      const response = await fetch("/api/company", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updated = await response.json();
        setCompanyInfo(updated);
        alert("Company information updated successfully!");
      } else {
        const error = await response.json();
        console.error("API Error:", error);
        const errorMsg = error.error || "Unknown error";
        const errorDetails = error.details || "";
        // Truncate error details if it's too long (likely base64 or long error message)
        const displayDetails =
          errorDetails.length > 200
            ? errorDetails.substring(0, 200) + "..."
            : errorDetails;
        alert(
          `Error: ${errorMsg}${displayDetails ? ` - ${displayDetails}` : ""}`,
        );
      }
    } catch (error: any) {
      console.error("Error updating company info:", error);
      alert(
        `Failed to update company information: ${error.message || "Unknown error"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Details</CardTitle>
        <CardDescription>
          Update your company information for invoices
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="ZERVTEK CO., LTD"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Logo</Label>
            <div className="flex gap-2">
              <Input
                id="logo"
                {...register("logo")}
                placeholder="https://example.com/logo.png or data:image/png;base64,..."
                className="flex-1"
              />
              <label
                htmlFor="logo-upload"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
              >
                {uploadingLogo ? "Uploading..." : "Upload"}
              </label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  // Validate file type
                  if (!file.type.startsWith("image/")) {
                    alert("Please select an image file");
                    return;
                  }

                  // Validate file size (max 2MB)
                  if (file.size > 2 * 1024 * 1024) {
                    alert("File size must be less than 2MB");
                    return;
                  }

                  setUploadingLogo(true);
                  try {
                    const formData = new FormData();
                    formData.append("file", file);

                    const response = await fetch("/api/company/upload-logo", {
                      method: "POST",
                      body: formData,
                    });

                    if (response.ok) {
                      const data = await response.json();
                      setValue("logo", data.logo);
                    } else {
                      const error = await response.json();
                      console.error("Upload error:", error);
                      const errorMsg = error.error || "Unknown error";
                      const errorDetails = error.details || "";
                      // Truncate error details if it's too long (likely base64)
                      const displayDetails =
                        errorDetails.length > 100
                          ? errorDetails.substring(0, 100) + "..."
                          : errorDetails;
                      alert(
                        `Error uploading logo: ${errorMsg}${displayDetails ? ` - ${displayDetails}` : ""}`,
                      );
                    }
                  } catch (error: any) {
                    console.error("Error uploading logo:", error);
                    alert(
                      `Failed to upload logo: ${error.message || "Unknown error"}`,
                    );
                  } finally {
                    setUploadingLogo(false);
                    // Reset the input so the same file can be selected again
                    e.target.value = "";
                  }
                }}
              />
            </div>
            {errors.logo && (
              <p className="text-sm text-red-500">{errors.logo.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Upload an image file or paste a URL/base64 string
            </p>
            {(() => {
              const logo = watch("logo");
              return (
                logo &&
                typeof logo === "string" &&
                logo.startsWith("data:image") && (
                  <div className="mt-2">
                    <img
                      src={logo}
                      alt="Logo preview"
                      className="h-20 w-auto border rounded"
                    />
                  </div>
                )
              );
            })()}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="info@company.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                {...register("website")}
                placeholder="www.company.com"
              />
              {errors.website && (
                <p className="text-sm text-red-500">{errors.website.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID</Label>
              <Input
                id="taxId"
                {...register("taxId")}
                placeholder="TAX-123456"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Address</Label>
            <div className="space-y-2">
              <Input
                placeholder="Street Address"
                {...register("address.street")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="City" {...register("address.city")} />
              <Input
                placeholder="State/Province"
                {...register("address.state")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="ZIP/Postal Code"
                {...register("address.zip")}
              />
              <Input placeholder="Country" {...register("address.country")} />
            </div>
          </div>

          {/* Bank Details 1 */}
          <div className="space-y-4 border-t pt-6">
            <Label className="text-lg font-semibold">Bank Details 1</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank1-name">Bank Name</Label>
                <Input
                  id="bank1-name"
                  placeholder="Bank Name"
                  {...register("bankDetails1.name")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank1-swift">SWIFT Code</Label>
                <Input
                  id="bank1-swift"
                  placeholder="SWIFT Code"
                  {...register("bankDetails1.swiftCode")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank1-branch">Branch Name</Label>
                <Input
                  id="bank1-branch"
                  placeholder="Branch Name"
                  {...register("bankDetails1.branchName")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank1-account">Account No.</Label>
                <Input
                  id="bank1-account"
                  placeholder="Account No."
                  {...register("bankDetails1.accountNo")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank1-address">Bank Address</Label>
              <Input
                id="bank1-address"
                placeholder="Bank Address"
                {...register("bankDetails1.bankAddress")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank1-account-name">Account Name</Label>
              <Input
                id="bank1-account-name"
                placeholder="Account Name"
                {...register("bankDetails1.accountName")}
              />
            </div>
          </div>

          {/* Bank Details 2 */}
          <div className="space-y-4 border-t pt-6">
            <Label className="text-lg font-semibold">Bank Details 2</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank2-name">Bank Name</Label>
                <Input
                  id="bank2-name"
                  placeholder="Bank Name"
                  {...register("bankDetails2.name")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank2-swift">SWIFT Code</Label>
                <Input
                  id="bank2-swift"
                  placeholder="SWIFT Code"
                  {...register("bankDetails2.swiftCode")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank2-branch">Branch Name</Label>
                <Input
                  id="bank2-branch"
                  placeholder="Branch Name"
                  {...register("bankDetails2.branchName")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank2-account">Account No.</Label>
                <Input
                  id="bank2-account"
                  placeholder="Account No."
                  {...register("bankDetails2.accountNo")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank2-address">Bank Address</Label>
              <Input
                id="bank2-address"
                placeholder="Bank Address"
                {...register("bankDetails2.bankAddress")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank2-account-name">Account Name</Label>
              <Input
                id="bank2-account-name"
                placeholder="Account Name"
                {...register("bankDetails2.accountName")}
              />
            </div>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
