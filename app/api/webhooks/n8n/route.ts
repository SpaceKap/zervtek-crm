import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { InquirySource, InquiryStatus } from "@prisma/client"

/**
 * n8n Webhook Endpoint
 * 
 * URL: https://crm.zervtek.com/api/webhooks/n8n
 * Method: POST
 * 
 * Accepts inquiries from n8n workflows and creates them in the CRM.
 * Supports multiple source types and different form structures:
 * 
 * Supported Sources:
 * - inquiry_form: Form with vehicles array
 * - stock_inquiry: Form with single vehicle and price
 * - hero_inquiry: Form with make, model, yearRange, budget
 * - email, chatbot, whatsapp, jct_stock_inquiry, onboarding_form
 * 
 * Payload formats:
 * 
 * 1. inquiry_form:
 * {
 *   "source": "inquiry_form",
 *   "name": "John Doe",
 *   "email": "customer@example.com",
 *   "phone": "+1234567890",
 *   "country": "Japan",
 *   "message": "Inquiry message",
 *   "vehicles": [
 *     { "make": "Toyota", "model": "Camry", "yearRange": "2010-2020" }
 *   ]
 * }
 * 
 * 2. stock_inquiry:
 * {
 *   "source": "stock_inquiry",
 *   "name": "John Doe",
 *   "email": "customer@example.com",
 *   "phone": "+1234567890",
 *   "country": "Japan",
 *   "message": "Inquiry message",
 *   "vehicle": "Toyota Camry",
 *   "price": "180,000"
 * }
 * 
 * 3. hero_inquiry:
 * {
 *   "source": "hero_inquiry",
 *   "name": "John Doe",
 *   "email": "customer@example.com",
 *   "phone": "+1234567890",
 *   "country": "Japan",
 *   "message": "Inquiry message",
 *   "make": "Toyota",
 *   "model": "Aqua",
 *   "yearRange": "2015 - 2020",
 *   "budget": "Under $10,000"
 * }
 * 
 * Note: 
 * - "name" or "customerName" can be used for customer name
 * - "country" or "destination" can be used for country
 * - "lookingFor" is auto-generated from form data if not provided
 * - "sourceId" is auto-generated from email+timestamp if not provided
 * - All form-specific fields are stored in metadata
 */

// Optional: Add webhook secret validation
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET

function normalizeSource(source: string): InquirySource {
  const normalized = source.toLowerCase().trim()
  if (normalized === "whatsapp") return InquirySource.WHATSAPP
  if (normalized === "email") return InquirySource.EMAIL
  if (normalized === "chatbot" || normalized === "chat") return InquirySource.CHATBOT
  if (normalized === "jct stock inquiry" || normalized === "jct_stock_inquiry" || normalized === "jctstockinquiry") return InquirySource.JCT_STOCK_INQUIRY
  if (normalized === "stock_inquiry" || normalized === "stock inquiry" || normalized === "stockinquiry") return InquirySource.STOCK_INQUIRY
  if (normalized === "onboarding form" || normalized === "onboarding_form" || normalized === "onboardingform") return InquirySource.ONBOARDING_FORM
  if (normalized === "hero_inquiry" || normalized === "hero inquiry" || normalized === "heroinquiry") return InquirySource.HERO_INQUIRY
  if (normalized === "inquiry_form" || normalized === "inquiry form" || normalized === "inquiryform") return InquirySource.INQUIRY_FORM
  // Default to INQUIRY_FORM if unknown (most common form type)
  return InquirySource.INQUIRY_FORM
}

export async function POST(request: NextRequest) {
  try {
    // Optional: Validate webhook secret
    // const authHeader = request.headers.get("authorization")
    // if (WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    const body: any = await request.json()
    
    // Log received body for debugging
    console.log("Received webhook payload:", JSON.stringify(body, null, 2))

    // Validate required fields - check for empty string too
    if (!body.source || (typeof body.source === 'string' && body.source.trim() === '')) {
      console.error("Missing or empty source field. Received body keys:", Object.keys(body))
      return NextResponse.json(
        { 
          error: "Missing required field: source",
          receivedFields: Object.keys(body),
          receivedBody: body
        },
        { status: 400 }
      )
    }

    // Normalize the source
    const normalizedSource = normalizeSource(body.source)
    console.log("Normalized source:", normalizedSource)

    // Handle different form structures and build lookingFor field
    let lookingFor = body.lookingFor || ""
    
    // inquiry_form: has vehicles array
    if (body.vehicles && Array.isArray(body.vehicles)) {
      lookingFor = body.vehicles
        .map((v: any) => {
          const make = v.make || ""
          const model = v.model || ""
          const yearRange = v.yearRange || ""
          return `${make} ${model}${yearRange ? ` (${yearRange})` : ""}`.trim()
        })
        .filter((v: string) => v)
        .join(", ")
    }
    // stock_inquiry: has vehicle (singular) and price
    else if (body.vehicle) {
      const vehicleStr = body.vehicle
      const priceStr = body.price ? ` - ${body.price}` : ""
      lookingFor = `${vehicleStr}${priceStr}`.trim()
    }
    // hero_inquiry: has make, model, yearRange, budget
    else if (body.make || body.model) {
      const parts: string[] = []
      if (body.make) parts.push(body.make)
      if (body.model) parts.push(body.model)
      if (body.yearRange) parts.push(`(${body.yearRange})`)
      if (body.budget) parts.push(`- Budget: ${body.budget}`)
      lookingFor = parts.join(" ").trim()
    }

    // Prepare metadata - merge existing metadata with top-level fields
    const metadata: any = {
      ...(body.metadata || {}),
      // Store form-specific data
      ...(body.vehicles ? { vehicles: body.vehicles } : {}),
      ...(body.vehicle ? { vehicle: body.vehicle } : {}),
      ...(body.price ? { price: body.price } : {}),
      ...(body.make ? { make: body.make } : {}),
      ...(body.model ? { model: body.model } : {}),
      ...(body.yearRange ? { yearRange: body.yearRange } : {}),
      ...(body.budget ? { budget: body.budget } : {}),
      ...(body.destination ? { destination: body.destination } : {}),
      // Include country and callingCode in metadata if provided at top level
      ...(body.country ? { country: body.country } : {}),
      ...(body.callingCode ? { callingCode: body.callingCode } : {}),
      // Set lookingFor if we built it
      ...(lookingFor ? { lookingFor } : {}),
    }
    
    // Ensure country from metadata is also included if not at top level
    if (!body.country && body.metadata?.country) {
      metadata.country = body.metadata.country
    }
    if (!body.callingCode && body.metadata?.callingCode) {
      metadata.callingCode = body.metadata.callingCode
    }

    // Check for duplicate based on sourceId if provided
    if (body.sourceId) {
      const existing = await prisma.inquiry.findFirst({
        where: {
          source: normalizedSource,
          sourceId: body.sourceId,
        },
      })

      if (existing) {
        return NextResponse.json(
          {
            error: "Inquiry already exists",
            inquiryId: existing.id,
          },
          { status: 409 }
        )
      }
    }

    // Extract phone, email, country, and customerName - prioritize top level, fallback to metadata
    const phone = body.phone || body.metadata?.phone || null
    const email = body.email || body.metadata?.email || null
    const country = body.country || body.metadata?.country || body.destination || null
    const customerName = body.customerName || body.name || null
    const message = body.message || body.metadata?.message || null
    
    // Generate sourceId if not provided (for duplicate detection)
    let sourceId = body.sourceId
    if (!sourceId && email) {
      const timestamp = Date.now()
      sourceId = `contactus-${email}-${timestamp}`
    }
    
    // Create the inquiry
    const inquiry = await prisma.inquiry.create({
      data: {
        source: normalizedSource,
        sourceId: sourceId || null,
        customerName: customerName,
        email: email,
        phone: phone,
        message: message,
        metadata: metadata,
        status: InquiryStatus.NEW,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    // Create history entry if we can find a system user or first manager
    // Skip history if no users exist yet (initial setup)
    try {
      const systemUser = await prisma.user.findFirst({
        where: { role: "MANAGER" },
        select: { id: true },
      })

      if (systemUser) {
        await prisma.inquiryHistory.create({
          data: {
            inquiryId: inquiry.id,
            userId: systemUser.id,
            action: "CREATED_VIA_WEBHOOK",
            newStatus: InquiryStatus.NEW,
            notes: `Created from ${normalizedSource} via n8n webhook`,
          },
        })
      }
    } catch (error) {
      // Skip history if user doesn't exist (initial setup scenario)
      console.warn("Could not create history entry for webhook inquiry:", error)
    }

    return NextResponse.json(
      {
        success: true,
        inquiry: inquiry,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error processing n8n webhook:", error)
    return NextResponse.json(
      {
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// Allow GET for health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "n8n webhook",
    timestamp: new Date().toISOString(),
  })
}
