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
 * Supports multiple source types: email, web, chatbot, whatsapp, jct_stock_inquiry, onboarding_form, contact_us_inquiry_form
 * 
 * Payload format:
 * {
 *   "source": "email" | "web" | "chatbot" | "whatsapp" | "jct stock inquiry" | "jct_stock_inquiry" | "onboarding form" | "onboarding_form" | "contact us inquiry form" | "contact_us_inquiry_form",
 *   "sourceId": "unique-id",
 *   "customerName": "John Doe",
 *   "email": "customer@example.com",
 *   "phone": "+1234567890",
 *   "country": "Japan",
 *   "message": "Inquiry message",
 *   "metadata": {
 *     "lookingFor": "What the customer is looking for",
 *     "country": "Japan",
 *     "callingCode": "+81",
 *     ...other metadata fields
 *   }
 * }
 * 
 * Note: 
 * - "lookingFor" can also be provided at the top level and will be moved to metadata automatically.
 * - "country" can be provided at top level and will be included in metadata.
 * - "phone", "email", and "country" are saved directly to the inquiry record.
 */

// Optional: Add webhook secret validation
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET

function normalizeSource(source: string): InquirySource {
  const normalized = source.toLowerCase().trim()
  if (normalized === "whatsapp") return InquirySource.WHATSAPP
  if (normalized === "email") return InquirySource.EMAIL
  if (normalized === "web" || normalized === "webform" || normalized === "web_form") return InquirySource.WEB
  if (normalized === "chatbot" || normalized === "chat") return InquirySource.CHATBOT
  if (normalized === "jct stock inquiry" || normalized === "jct_stock_inquiry" || normalized === "jctstockinquiry") return InquirySource.JCT_STOCK_INQUIRY
  if (normalized === "onboarding form" || normalized === "onboarding_form" || normalized === "onboardingform") return InquirySource.ONBOARDING_FORM
  if (normalized === "contact us inquiry form" || normalized === "contact_us_inquiry_form" || normalized === "contactusinquiryform") return InquirySource.CONTACT_US_INQUIRY_FORM
  if (normalized === "hero_inquiry" || normalized === "hero inquiry" || normalized === "heroinquiry") return InquirySource.HERO_INQUIRY
  if (normalized === "inquiry_form" || normalized === "inquiry form" || normalized === "inquiryform") return InquirySource.INQUIRY_FORM
  // Default to WEB if unknown
  return InquirySource.WEB
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

    // Prepare metadata - merge existing metadata with top-level fields
    const metadata = {
      ...(body.metadata || {}),
      ...(body.lookingFor ? { lookingFor: body.lookingFor } : {}),
      // Include country and callingCode in metadata if provided at top level
      ...(body.country ? { country: body.country } : {}),
      ...(body.callingCode ? { callingCode: body.callingCode } : {}),
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

    // Extract phone, email, and country - prioritize top level, fallback to metadata
    const phone = body.phone || body.metadata?.phone || null
    const email = body.email || body.metadata?.email || null
    const country = body.country || body.metadata?.country || null
    
    // Create the inquiry
    const inquiry = await prisma.inquiry.create({
      data: {
        source: normalizedSource,
        sourceId: body.sourceId || null,
        customerName: body.customerName || null,
        email: email,
        phone: phone,
        message: body.message || null,
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
