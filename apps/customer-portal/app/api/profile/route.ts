import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/db";
import { z } from "zod";

const addressSchema = z.object({
  street: z.string().optional(),
  apartment: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
});

const profileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  country: z.string().optional(),
  portOfDestination: z.string().optional(),
  billingAddress: addressSchema.optional().nullable(),
  shippingAddress: addressSchema.optional().nullable(),
});

export async function GET(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const customer = await prisma.customer.findUnique({
    where: { id: token.id as string },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      country: true,
      billingAddress: true,
      shippingAddress: true,
      portOfDestination: true,
    },
  });
  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(customer);
}

export async function PATCH(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const customer = await prisma.customer.update({
    where: { id: token.id as string },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone ?? null,
      country: data.country ?? null,
      portOfDestination: data.portOfDestination ?? null,
      billingAddress: data.billingAddress ?? undefined,
      shippingAddress: data.shippingAddress ?? undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      country: true,
      billingAddress: true,
      shippingAddress: true,
      portOfDestination: true,
    },
  });

  // Notify CRM to invalidate cache so customer/vehicle pages show updated data (e.g. port of destination)
  const crmUrl = process.env.CRM_URL;
  const crmSecret = process.env.CRM_INTERNAL_SECRET;
  if (crmUrl && crmSecret) {
    fetch(`${crmUrl.replace(/\/$/, "")}/api/internal/invalidate-customer-cache`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": crmSecret,
      },
      body: JSON.stringify({ customerId: customer.id }),
    }).catch(() => {});
  }

  return NextResponse.json(customer);
}
