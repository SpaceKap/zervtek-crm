import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchName = searchParams.get("name");

    // Get all customers
    const allCustomers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // If searching for a specific name
    if (searchName) {
      const matchingCustomers = await prisma.customer.findMany({
        where: {
          name: {
            contains: searchName,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      });

      return NextResponse.json({
        totalCustomers: allCustomers.length,
        searchTerm: searchName,
        matchingCustomers,
        allCustomers: allCustomers.slice(0, 20), // First 20 for reference
      });
    }

    return NextResponse.json({
      totalCustomers: allCustomers.length,
      customers: allCustomers,
    });
  } catch (error: any) {
    console.error("Error in customer debug endpoint:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch customer debug info",
        details: error.message || String(error),
        code: error.code || "UNKNOWN",
      },
      { status: 500 }
    );
  }
}
