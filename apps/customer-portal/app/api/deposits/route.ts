import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const depositSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  method: z.enum(["PAYPAL", "WISE", "BANK_TRANSFER"]),
  referenceNumber: z.string().optional(),
  depositProofUrl: z.string().url().optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = depositSchema.safeParse({
      ...body,
      amount: typeof body.amount === "string" ? parseFloat(body.amount) : body.amount,
    });

    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join("; ");
      return NextResponse.json({ error: msg || "Validation failed" }, { status: 400 });
    }

    const { amount, method, referenceNumber, depositProofUrl } = parsed.data;

    const transaction = await prisma.transaction.create({
      data: {
        direction: "INCOMING",
        type: method,
        amount,
        currency: "JPY",
        date: new Date(),
        description: "Deposit",
        customerId: session.user.id,
        referenceNumber: referenceNumber?.trim() || null,
        depositProofUrl: depositProofUrl?.trim() || null,
        depositReceivedAt: null,
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        date: true,
        type: true,
        description: true,
        referenceNumber: true,
        depositProofUrl: true,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Deposit creation error:", error);
    return NextResponse.json(
      { error: "Failed to record deposit" },
      { status: 500 }
    );
  }
}
