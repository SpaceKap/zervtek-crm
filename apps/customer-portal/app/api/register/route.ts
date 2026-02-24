import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { z } from "zod";

const addressSchema = z.object({
  street: z.string().optional(),
  apartment: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
});

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  phoneCountryCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  country: z.string().min(1, "Country is required").optional(),
  portOfDestination: z.string().optional(),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
  sameAsBilling: z.boolean().optional(),
  howFoundUs: z.string().optional(),
  assignedToId: z.string().uuid().optional().nullable(),
}).refine(
  (data) => {
    const hasName = (data.name && data.name.trim()) || (data.firstName?.trim() || data.lastName?.trim());
    const hasPhone = (data.phone && data.phone.trim()) || (data.phoneCountryCode && data.phoneNumber);
    return !!hasName && !!hasPhone;
  },
  { message: "Name and phone (country code + number) are required", path: ["email"] }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((e) => e.message).join("; ");
      return NextResponse.json(
        { error: msg || "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const d = parsed.data;
    const name =
      (d.name && d.name.trim()) ||
      [d.firstName, d.lastName].filter(Boolean).join(" ").trim() ||
      "";
    const phone =
      (d.phone && d.phone.trim()) ||
      ([d.phoneCountryCode, d.phoneNumber].filter(Boolean).join(" ").trim() || null);
    const country = d.country?.trim() || null;
    let billingAddress = d.billingAddress ?? undefined;
    let shippingAddress = d.shippingAddress ?? undefined;
    if (d.sameAsBilling && billingAddress) {
      shippingAddress = billingAddress;
    }

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json(
        { error: "Phone (country code and number) is required" },
        { status: 400 }
      );
    }
    if (!country) {
      return NextResponse.json(
        { error: "Country is required" },
        { status: 400 }
      );
    }

    const emailNormalized = d.email.trim().toLowerCase();
    const existing = await prisma.customer.findFirst({
      where: { email: { equals: emailNormalized, mode: "insensitive" } },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        emailVerifiedAt: true,
      },
    });

    const passwordHash = await hash(d.password, 12);
    const emailVerificationToken = randomBytes(32).toString("hex");
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let customer: { id: string; name: string; email: string | null };

    if (existing) {
      // Already has a portal account (signed up before and verified)
      if (existing.passwordHash && existing.emailVerifiedAt) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
      // Pre-created customer from admin: link registration to existing record so
      // their vehicles, invoices, documents, transactions stay attached
      const updated = await prisma.customer.update({
        where: { id: existing.id },
        data: {
          name,
          email: d.email.trim(),
          phone,
          country,
          portOfDestination: d.portOfDestination ?? null,
          billingAddress: billingAddress ?? undefined,
          shippingAddress: shippingAddress ?? undefined,
          howFoundUs: d.howFoundUs ?? null,
          assignedToId: d.assignedToId ?? undefined,
          passwordHash,
          emailVerificationToken,
          emailVerificationExpiresAt,
          emailVerifiedAt: null, // must verify email before first login
        },
        select: { id: true, name: true, email: true },
      });
      customer = updated;
    } else {
      customer = await prisma.customer.create({
        data: {
          name,
          email: d.email.trim(),
          phone,
          country,
          portOfDestination: d.portOfDestination ?? null,
          billingAddress: billingAddress ?? undefined,
          shippingAddress: shippingAddress ?? undefined,
          howFoundUs: d.howFoundUs ?? null,
          assignedToId: d.assignedToId ?? null,
          passwordHash,
          emailVerificationToken,
          emailVerificationExpiresAt,
        },
        select: { id: true, name: true, email: true },
      });
    }

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.PORTAL_URL ||
      (request.headers.get("origin") ?? `http://localhost:${process.env.PORT ?? 3001}`);
    const verifyUrl = `${baseUrl.replace(/\/$/, "")}/api/verify-email?token=${emailVerificationToken}`;
    await sendVerificationEmail(d.email, name, verifyUrl);

    return NextResponse.json({
      message:
        "Account created. Please check your email to verify your address before signing in.",
      customer: { id: customer.id, name: customer.name, email: customer.email },
    });
  } catch (e) {
    console.error("Register error:", e);
    const message =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? e.message
        : "Registration failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
