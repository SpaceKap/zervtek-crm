import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getCached, invalidateCache, invalidateCachePattern } from "@/lib/cache";

const CUSTOMER_CACHE_TTL = 300; // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cacheKey = `customer:id:${params.id}`;
    const body = await getCached<{ __notFound?: boolean; error?: string; [k: string]: unknown }>(
      cacheKey,
      async () => {
        const customer = await prisma.customer.findUnique({
          where: { id: params.id },
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            vehicles: {
              include: {
                invoices: {
                  select: {
                    id: true,
                    invoiceNumber: true,
                    status: true,
                    paymentStatus: true,
                    issueDate: true,
                    dueDate: true,
                    finalizedAt: true,
                  },
                  orderBy: { createdAt: "desc" as const },
                },
                shippingStage: {
                  include: {
                    yard: { select: { id: true, name: true } },
                  },
                },
              },
              orderBy: { createdAt: "desc" as const },
            },
            invoices: {
              include: {
                vehicle: { select: { id: true, vin: true, make: true, model: true, year: true } },
                charges: { include: { chargeType: { select: { id: true, name: true } } } },
              },
              orderBy: { createdAt: "desc" as const },
            },
            transactions: {
              include: {
                vehicle: { select: { id: true, vin: true, make: true, model: true, year: true } },
                vendor: { select: { id: true, name: true } },
              },
              orderBy: { date: "desc" as const },
            },
          },
        });

        if (!customer) {
          const customerByName = await prisma.customer.findFirst({
            where: { name: { contains: params.id, mode: "insensitive" } },
            select: { id: true, name: true },
          });
          const totalCustomers = await prisma.customer.count();
          return {
            __notFound: true,
            error: "Customer not found",
            searchedId: params.id,
            totalCustomers,
            suggestion: customerByName ? `Did you mean: ${customerByName.name} (ID: ${customerByName.id})?` : null,
          };
        }

        const vehicleIds = customer.vehicles?.map((v: { id: string }) => v.id) || [];
        const documents =
          vehicleIds.length > 0
            ? await prisma.vehicleDocument.findMany({
                where: { vehicleId: { in: vehicleIds } },
                include: {
                  vehicle: { select: { id: true, vin: true, make: true, model: true, year: true } },
                },
                orderBy: { createdAt: "desc" },
              })
            : [];

        return { ...customer, documents };
      },
      CUSTOMER_CACHE_TTL,
      (v) => !v.__notFound
    );

    if (body.__notFound) {
      return NextResponse.json(
        {
          error: body.error,
          searchedId: body.searchedId,
          totalCustomers: body.totalCustomers,
          suggestion: body.suggestion ?? null,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(body);
  } catch (error: unknown) {
    console.error("[Customer API] Error fetching customer:", error);
    const err = error as { message?: string; code?: string; meta?: unknown; stack?: string };
    console.error("[Customer API] Error details:", {
      message: err?.message || String(error),
      code: err?.code,
      meta: err?.meta,
      stack: err?.stack,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch customer",
        details: process.env.NODE_ENV === "development" ? (err?.message || String(error)) : "An error occurred while fetching customer data",
        code: err?.code || "UNKNOWN",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      country,
      billingAddress,
      shippingAddress,
      portOfDestination,
      assignedToId,
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name);
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (country !== undefined) updateData.country = country || null;
    if (billingAddress !== undefined) updateData.billingAddress = billingAddress || null;
    if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress || null;
    if (portOfDestination !== undefined) updateData.portOfDestination = portOfDestination || null;
    // Only ADMIN and MANAGER can change customer assignment
    if (
      assignedToId !== undefined &&
      (session.user.role === UserRole.ADMIN || session.user.role === UserRole.MANAGER)
    ) {
      updateData.assignedToId = assignedToId || null;
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: params.id },
      data: updateData as Record<string, unknown>,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await invalidateCache(`customer:id:${params.id}`);
    await invalidateCachePattern("customers:list:");

    return NextResponse.json(updatedCustomer);
  } catch (error: unknown) {
    console.error("[Customer API] Error updating customer:", error);
    const err = error as { message?: string };
    return NextResponse.json(
      {
        error: "Failed to update customer",
        details: process.env.NODE_ENV === "development" ? (err?.message || String(error)) : "An error occurred while updating customer",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    });
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    await prisma.customer.delete({
      where: { id: params.id },
    });

    await invalidateCache(`customer:id:${params.id}`);
    await invalidateCachePattern("customers:list:");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Customer API] Error deleting customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
