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

const chargeTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum([
    "EXPORT_FEES",
    "SHIPPING",
    "ADDITIONAL_TRANSPORT",
    "RECYCLE_FEES",
    "CUSTOM",
  ]),
});

type ChargeTypeFormData = z.infer<typeof chargeTypeSchema>;

interface ChargeTypeFormProps {
  chargeType?: {
    id: string;
    name: string;
    category:
      | "EXPORT_FEES"
      | "SHIPPING"
      | "ADDITIONAL_TRANSPORT"
      | "RECYCLE_FEES"
      | "CUSTOM";
  } | null;
  onClose: () => void;
}

export function ChargeTypeForm({ chargeType, onClose }: ChargeTypeFormProps) {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ChargeTypeFormData>({
    resolver: zodResolver(chargeTypeSchema),
    defaultValues: {
      name: chargeType?.name || "",
      category: chargeType?.category || "CUSTOM",
    },
  });

  const category = watch("category");

  const onSubmit = async (data: ChargeTypeFormData) => {
    setSaving(true);
    try {
      const url = chargeType
        ? `/api/charge-types/${chargeType.id}`
        : "/api/charge-types";
      const method = chargeType ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        onClose();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error saving charge type:", error);
      alert("Failed to save charge type");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {chargeType ? "Edit Charge Type" : "Add Charge Type"}
          </DialogTitle>
          <DialogDescription>
            {chargeType
              ? "Update charge type information"
              : "Create a new charge type"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={(value) =>
                setValue(
                  "category",
                  value as
                    | "EXPORT_FEES"
                    | "SHIPPING"
                    | "ADDITIONAL_TRANSPORT"
                    | "RECYCLE_FEES"
                    | "CUSTOM",
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPORT_FEES">Export Fees</SelectItem>
                <SelectItem value="SHIPPING">Shipping</SelectItem>
                <SelectItem value="ADDITIONAL_TRANSPORT">
                  Additional Transport
                </SelectItem>
                <SelectItem value="RECYCLE_FEES">Recycle Fees</SelectItem>
                <SelectItem value="CUSTOM">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : chargeType ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
