"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const leadSchema = z.object({
  source: z.enum(["WHATSAPP", "EMAIL", "WEB", "CHATBOT"]),
  customerName: z.string().min(1, "Customer name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  message: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

export function LeadForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
  });

  const source = watch("source");

  const onSubmit = async (data: LeadFormData) => {
    try {
      setLoading(true);
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          email: data.email || undefined,
          phone: data.phone || undefined,
          message: data.message || undefined,
        }),
      });

      if (response.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create lead");
      }
    } catch (error) {
      console.error("Error creating lead:", error);
      alert("Failed to create lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Add New Lead</CardTitle>
        <CardDescription>
          Manually add a customer inquiry to your pipeline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="source">Source *</Label>
            <Select
              value={source || ""}
              onValueChange={(value) =>
                setValue(
                  "source",
                  value as "WHATSAPP" | "EMAIL" | "WEB" | "CHATBOT",
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="WEB">Web</SelectItem>
                <SelectItem value="CHATBOT">Chatbot</SelectItem>
              </SelectContent>
            </Select>
            {errors.source && (
              <p className="text-sm text-destructive mt-1">
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
              <p className="text-sm text-destructive mt-1">
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
              <p className="text-sm text-destructive mt-1">
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
            <Label htmlFor="message">Message / Notes</Label>
            <Textarea
              id="message"
              {...register("message")}
              placeholder="Customer inquiry details..."
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Lead"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
