import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageUsers } from "@/lib/permissions"

export async function GET() {
  try {
    const companyInfo = await prisma.companyInfo.findFirst()

    if (!companyInfo) {
      return NextResponse.json(
        { error: "Company info not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(companyInfo)
  } catch (error) {
    console.error("Error fetching company info:", error)
    return NextResponse.json(
      { error: "Failed to fetch company info" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageUsers(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, logo, address, phone, email, website, taxId, bankDetails1, bankDetails2 } = body

    // Get existing company info or create if doesn't exist
    const existingCompany = await prisma.companyInfo.findFirst()

    // Prepare data object, handling null/empty strings
    const updateData: any = {}
    if (name !== undefined && name !== null) updateData.name = name
    if (logo !== undefined) {
      // Handle logo: empty string or null becomes null, otherwise keep the value
      // Base64 strings can be very long, so we ensure they're properly handled
      if (logo === "" || logo === null) {
        updateData.logo = null
      } else {
        // Validate logo is not too long (sanity check - should be handled by @db.Text)
        if (typeof logo === "string" && logo.length > 10000000) {
          return NextResponse.json(
            { error: "Logo data is too large. Please use a smaller image or a URL instead." },
            { status: 400 }
          )
        }
        updateData.logo = logo
      }
    }
    if (address !== undefined) updateData.address = address || {}
    if (phone !== undefined) updateData.phone = phone === "" || phone === null ? null : phone
    if (email !== undefined) updateData.email = email === "" || email === null ? null : email
    if (website !== undefined) updateData.website = website === "" || website === null ? null : website
    if (taxId !== undefined) updateData.taxId = taxId === "" || taxId === null ? null : taxId
    if (bankDetails1 !== undefined) updateData.bankDetails1 = bankDetails1 || {}
    if (bankDetails2 !== undefined) updateData.bankDetails2 = bankDetails2 || {}

    const companyInfo = existingCompany
      ? await prisma.companyInfo.update({
          where: { id: existingCompany.id },
          data: updateData,
        })
      : await prisma.companyInfo.create({
          data: {
            name: name || "ZERVTEK CO., LTD",
            logo: logo || null,
            address: address || {},
            phone: phone || null,
            email: email || null,
            website: website || null,
            taxId: taxId || null,
            bankDetails1: bankDetails1 || {},
            bankDetails2: bankDetails2 || {},
          },
        })

    return NextResponse.json(companyInfo)
  } catch (error: any) {
    console.error("Error updating company info:", error)
    // Don't expose full error details in production, but log them
    const errorMessage = error.message || "Unknown error"
    const isPrismaError = error.code && error.code.startsWith("P")
    
    // For Prisma errors, provide more helpful messages
    let userMessage = "Failed to update company info"
    if (isPrismaError) {
      if (error.code === "P2002") {
        userMessage = "A record with this information already exists"
      } else if (error.code === "P2025") {
        userMessage = "Record not found"
      } else if (errorMessage.includes("String") || errorMessage.includes("length")) {
        userMessage = "Logo data is too large. Please use a smaller image or a URL instead."
      }
    }
    
    return NextResponse.json(
      { 
        error: userMessage,
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}
