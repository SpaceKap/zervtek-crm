"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { UserRole } from "@prisma/client";

interface User {
  id: string;
  name: string | null;
  email: string;
}

const inquirySchema = z.object({
  source: z.enum([
    "WHATSAPP",
    "EMAIL",
    "WEB",
    "CHATBOT",
    "JCT_STOCK_INQUIRY",
    "STOCK_INQUIRY",
    "ONBOARDING_FORM",
    "CONTACT_US_INQUIRY_FORM",
  ]),
  customerName: z.string().min(1, "Customer name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  message: z.string().optional(),
  lookingFor: z.string().optional(),
  assignToId: z.string().optional(),
});

type InquiryFormData = z.infer<typeof inquirySchema>;

interface AddInquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  isManager: boolean;
  users?: User[];
  defaultStatus?: string;
}

export function AddInquiryDialog({
  open,
  onOpenChange,
  onSuccess,
  isManager,
  users = [],
  defaultStatus,
}: AddInquiryDialogProps) {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
  });

  const onSubmit = async (data: InquiryFormData) => {
    try {
      setLoading(true);
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: data.source,
          customerName: data.customerName,
          email: data.email || undefined,
          phone: data.phone || undefined,
          message: data.message || undefined,
          lookingFor: data.lookingFor || undefined,
          assignToId: isManager ? data.assignToId || undefined : undefined,
          ...(defaultStatus && { status: defaultStatus }),
        }),
      });

      if (response.ok) {
        reset();
        onOpenChange(false);
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create inquiry");
      }
    } catch (error) {
      console.error("Error creating inquiry:", error);
      alert("Failed to create inquiry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Inquiry</DialogTitle>
          <DialogDescription>
            Create a new customer inquiry and add it to the pool
          </DialogDescription>
        </DialogHeader>
        <DialogClose onClose={() => onOpenChange(false)} />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6 pt-0">
          <div>
            <Label htmlFor="source">Source *</Label>
            <select
              id="source"
              {...register("source")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select source</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
              <option value="WEB">Web</option>
              <option value="CHATBOT">Chatbot</option>
              <option value="JCT_STOCK_INQUIRY">JCT Stock Inquiry</option>
              <option value="ONBOARDING_FORM">Onboarding Form</option>
              <option value="CONTACT_US_INQUIRY_FORM">
                Contact Us Inquiry Form
              </option>
              <option value="HERO_INQUIRY">Hero Section Inquiry</option>
              <option value="INQUIRY_FORM">Contact Form Inquiry</option>
            </select>
            {errors.source && (
              <p className="text-sm text-red-500 mt-1">
                {errors.source.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="customerName">Customer Name *</Label>
            <Input
              id="customerName"
              {...register("customerName")}
              placeholder="John Doe"
            />
            {errors.customerName && (
              <p className="text-sm text-red-500 mt-1">
                {errors.customerName.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              {...register("phone")}
              placeholder="+1234567890"
            />
          </div>

          <div>
            <Label htmlFor="lookingFor">Looking For</Label>
            <Input
              id="lookingFor"
              {...register("lookingFor")}
              placeholder="What the customer is looking for..."
            />
          </div>

          <div>
            <Label htmlFor="message">Message / Notes</Label>
            <Textarea
              id="message"
              {...register("message")}
              placeholder="Customer inquiry details..."
              rows={4}
            />
          </div>

          {isManager && users.length > 0 && (
            <div>
              <Label htmlFor="assignToId">Assign To (Optional)</Label>
              <select
                id="assignToId"
                {...register("assignToId")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Unassigned</option>
                <option value="me">Assign to me</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Inquiry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
