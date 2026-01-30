"use client";

import { useState } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface VendorFormProps {
  vendor?: {
    id: string;
    name: string;
  } | null;
  onClose: (createdVendorId?: string) => void;
}

export function VendorForm({ vendor, onClose }: VendorFormProps) {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: vendor?.name || "",
    },
  });

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
        body: JSON.stringify(data),
      });

      if (response.ok) {
        if (!vendor) {
          // If creating a new vendor, get the created vendor ID
          const createdVendor = await response.json();
          onClose(createdVendor.id);
        } else {
          onClose();
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error saving vendor:", error);
      alert("Failed to save vendor");
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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
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
