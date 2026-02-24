import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[Customer API] Fetching customer with ID: ${params.id}`);
    
    // First, try to find the customer
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
              orderBy: {
                createdAt: "desc",
              },
            },
            shippingStage: {
              include: {
                yard: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        invoices: {
          include: {
            vehicle: {
              select: {
                id: true,
                vin: true,
                make: true,
                model: true,
                year: true,
              },
            },
            charges: {
              include: {
                chargeType: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        transactions: {
          include: {
            vehicle: {
              select: {
                id: true,
                vin: true,
                make: true,
                model: true,
                year: true,
              },
            },
            vendor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            date: "desc",
          },
        },
      },
    });

    if (!customer) {
      // Try to find by name as a fallback for debugging
      const customerByName = await prisma.customer.findFirst({
        where: {
          name: {
            contains: params.id,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          name: true,
        },
      });
      
      console.log(`[Customer API] Customer not found with ID: ${params.id}`);
      if (customerByName) {
        console.log(`[Customer API] Found customer by name search: ${customerByName.name} (ID: ${customerByName.id})`);
      }
      
      // Also check total customer count
      const totalCustomers = await prisma.customer.count();
      console.log(`[Customer API] Total customers in database: ${totalCustomers}`);
      
      return NextResponse.json(
        { 
          error: "Customer not found",
          searchedId: params.id,
          totalCustomers,
          suggestion: customerByName ? `Did you mean: ${customerByName.name} (ID: ${customerByName.id})?` : null,
        },
        { status: 404 }
      );
    }
    
    console.log(`[Customer API] Found customer: ${customer.name} (ID: ${customer.id})`);

    // Get all documents for customer's vehicles
    const vehicleIds = customer.vehicles?.map((v: any) => v.id) || [];
    const documents = vehicleIds.length > 0
      ? await prisma.vehicleDocument.findMany({
          where: {
            vehicleId: {
              in: vehicleIds,
            },
          },
          include: {
            vehicle: {
              select: {
                id: true,
                vin: true,
                make: true,
                model: true,
                year: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        })
      : [];

    return NextResponse.json({
      ...customer,
      documents: documents || [],
    });
  } catch (error: any) {
    console.error("[Customer API] Error fetching customer:", error);
    console.error("[Customer API] Error details:", {
      message: error?.message || String(error),
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });
    return NextResponse.json(
      { 
        error: "Failed to fetch customer",
        details: process.env.NODE_ENV === "development" 
          ? (error?.message || String(error))
          : "An error occurred while fetching customer data",
        code: error?.code || "UNKNOWN",
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
      data: updateData as any,
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

    return NextResponse.json(updatedCustomer);
  } catch (error: any) {
    console.error("[Customer API] Error updating customer:", error);
    return NextResponse.json(
      {
        error: "Failed to update customer",
        details: process.env.NODE_ENV === "development"
          ? (error?.message || String(error))
          : "An error occurred while updating customer",
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Customer API] Error deleting customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
