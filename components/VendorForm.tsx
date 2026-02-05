"use client";

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VendorCategory } from "@prisma/client";

const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  category: z.nativeEnum(VendorCategory),
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface VendorFormProps {
  vendor?: {
    id: string;
    name: string;
    email?: string | null;
    category?: VendorCategory;
  } | null;
  onClose: (createdVendorId?: string) => void;
}

export function VendorForm({ vendor, onClose }: VendorFormProps) {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: vendor?.name || "",
      email: vendor?.email || "",
      category: vendor?.category || VendorCategory.DEALERSHIP,
    },
  });

  // Reset form when vendor prop changes
  useEffect(() => {
    if (vendor) {
      const categoryValue = vendor.category || VendorCategory.DEALERSHIP;
      reset({
        name: vendor.name || "",
        email: vendor.email || "",
        category: categoryValue,
      });
      // Ensure category is set in the form
      setValue("category", categoryValue, { shouldValidate: true });
    } else {
      // Reset to defaults for new vendor
      reset({
        name: "",
        email: "",
        category: VendorCategory.DEALERSHIP,
      });
      setValue("category", VendorCategory.DEALERSHIP, { shouldValidate: true });
    }
  }, [vendor, reset, setValue]);

  const category = watch("category") || VendorCategory.DEALERSHIP;

  const onSubmit = async (data: VendorFormData) => {
    setSaving(true);
    try {
      const url = vendor ? `/api/vendors/${vendor.id}` : "/api/vendors";
      const method = vendor ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email || null,
          category: data.category || VendorCategory.DEALERSHIP,
        }),
      });

      if (response.ok) {
        if (!vendor) {
          // If creating a new vendor, get the created vendor ID
          const createdVendor = await response.json();
          onClose(createdVendor.id);
        } else {
          // Wait a moment to ensure the update is persisted before closing
          await new Promise((resolve) => setTimeout(resolve, 100));
          onClose();
        }
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Failed to save vendor";
        const errorDetails = errorData.details ? ` (${errorData.details})` : "";
        alert(`Error: ${errorMessage}${errorDetails}`);
        console.error("Error response:", errorData);
      }
    } catch (error) {
      console.error("Error saving vendor:", error);
      alert(
        `Failed to save vendor: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{vendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
          <DialogDescription>
            {vendor
              ? "Update vendor information"
              : "Create a new vendor for cost tracking"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2 px-6">
            <Label htmlFor="name" className="text-sm font-medium">
              Vendor Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., USS, Daiwa Logistics, Logico"
              className="w-full"
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1.5">
                {errors.name.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              Enter the vendor company name
            </p>
          </div>

          <div className="space-y-2 px-6">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="vendor@example.com"
              className="w-full"
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1.5">
                {errors.email.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              Email for auto-sending documents (e.g., SI/EC to forwarder)
            </p>
          </div>

          <div className="space-y-2 px-6">
            <Label htmlFor="category" className="text-sm font-medium">
              Vendor Category <span className="text-red-500">*</span>
            </Label>
            <Select
              key={vendor?.id || "new"}
              value={category || VendorCategory.DEALERSHIP}
              onValueChange={(value) =>
                setValue("category", value as VendorCategory, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={VendorCategory.DEALERSHIP}>
                  Dealership
                </SelectItem>
                <SelectItem value={VendorCategory.AUCTION_HOUSE}>
                  Auction House
                </SelectItem>
                <SelectItem value={VendorCategory.TRANSPORT_VENDOR}>
                  Transport Company
                </SelectItem>
                <SelectItem value={VendorCategory.GARAGE}>Garage</SelectItem>
                <SelectItem value={VendorCategory.FREIGHT_VENDOR}>
                  Freight Company
                </SelectItem>
                <SelectItem value={VendorCategory.FORWARDER}>
                  Forwarder
                </SelectItem>
                <SelectItem value={VendorCategory.SHIPPING_AGENT}>
                  Shipping Agent
                </SelectItem>
                <SelectItem value={VendorCategory.YARD}>Yard</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500 mt-1.5">
                {errors.category.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              Select the category that best describes this vendor.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose()}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? vendor
                  ? "Updating..."
                  : "Creating..."
                : vendor
                  ? "Update Vendor"
                  : "Create Vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
