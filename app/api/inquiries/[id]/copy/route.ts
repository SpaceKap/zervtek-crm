import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InquiryStatus } from "@prisma/client";
import { canViewAllInquiries } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
    });

    if (!inquiry) {
      return NextResponse.json(
        { error: "Inquiry not found" },
        { status: 404 }
      );
    }

    const canViewAll = canViewAllInquiries(session.user.role);
    if (
      !canViewAll &&
      inquiry.assignedToId !== session.user.id &&
      inquiry.assignedToId !== null
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const metadata = (inquiry.metadata as any) || {};
    const { notes, ...metadataWithoutNotes } = metadata;

    const copy = await prisma.inquiry.create({
      data: {
        source: inquiry.source,
        sourceId: null,
        customerName: inquiry.customerName,
        email: inquiry.email,
        phone: inquiry.phone,
        message: inquiry.message,
        lookingFor: inquiry.lookingFor,
        status: InquiryStatus.NEW,
        assignedToId: null,
        assignedAt: null,
        metadata: metadataWithoutNotes,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    await prisma.inquiryHistory.create({
      data: {
        inquiryId: copy.id,
        userId: session.user.id,
        action: "COPIED",
        newStatus: InquiryStatus.NEW,
        notes: `Copied from inquiry ${inquiry.id}`,
      },
    });

    return NextResponse.json(copy, { status: 201 });
  } catch (error) {
    console.error("Error copying inquiry:", error);
    return NextResponse.json(
      { error: "Failed to copy inquiry" },
      { status: 500 }
    );
  }
}
