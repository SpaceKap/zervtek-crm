import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { InvoiceStatus } from "@prisma/client"
import { randomBytes } from "crypto"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    // Only allow sharing approved or finalized invoices
    if (
      invoice.status !== InvoiceStatus.APPROVED &&
      invoice.status !== InvoiceStatus.FINALIZED
    ) {
      return NextResponse.json(
        { error: "Invoice must be approved before it can be shared" },
        { status: 400 }
      )
    }

    // Generate a unique share token if one doesn't exist
    let shareToken = invoice.shareToken
    if (!shareToken) {
      // Generate a secure random token
      shareToken = randomBytes(32).toString("base64url")
      
      // Ensure uniqueness
      let isUnique = false
      while (!isUnique) {
        const existing = await prisma.invoice.findUnique({
          where: { shareToken },
        })
        if (!existing) {
          isUnique = true
        } else {
          shareToken = randomBytes(32).toString("base64url")
        }
      }

      // Save the token
      await prisma.invoice.update({
        where: { id: params.id },
        data: { shareToken },
      })
    }

    // Generate the public URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const publicUrl = `${baseUrl}/invoice/${shareToken}`

    return NextResponse.json({
      shareToken,
      publicUrl,
    })
  } catch (error) {
    console.error("Error generating share token:", error)
    return NextResponse.json(
      { error: "Failed to generate share token" },
      { status: 500 }
    )
  }
}
