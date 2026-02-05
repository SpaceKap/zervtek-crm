import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import nodemailer from "nodemailer"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const vehicleId = params.id
    const body = await request.json()
    const { shippingAgentEmail } = body

    if (!shippingAgentEmail) {
      return NextResponse.json(
        { error: "Shipping agent email is required" },
        { status: 400 }
      )
    }

    // Fetch vehicle details
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        shippingStage: true,
      },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      )
    }

    // Prepare email content
    const vehicleDetails = [
      `VIN: ${vehicle.vin}`,
      vehicle.stockNo ? `Stock No: ${vehicle.stockNo}` : null,
      vehicle.make ? `Make: ${vehicle.make}` : null,
      vehicle.model ? `Model: ${vehicle.model}` : null,
      vehicle.year ? `Year: ${vehicle.year}` : null,
      vehicle.chassisNo ? `Chassis No: ${vehicle.chassisNo}` : null,
      vehicle.auctionHouse ? `Auction House: ${vehicle.auctionHouse}` : null,
      vehicle.lotNo ? `Lot No: ${vehicle.lotNo}` : null,
      vehicle.purchaseDate
        ? `Purchase Date: ${new Date(vehicle.purchaseDate).toLocaleDateString()}`
        : null,
    ]
      .filter(Boolean)
      .join("\n")

    const bookingDetails = vehicle.shippingStage
      ? [
          vehicle.shippingStage.bookingType
            ? `Booking Type: ${vehicle.shippingStage.bookingType}`
            : null,
          vehicle.shippingStage.bookingNumber
            ? `Booking Number: ${vehicle.shippingStage.bookingNumber}`
            : null,
          vehicle.shippingStage.pod ? `POD: ${vehicle.shippingStage.pod}` : null,
          vehicle.shippingStage.pol ? `POL: ${vehicle.shippingStage.pol}` : null,
          vehicle.shippingStage.vesselName
            ? `Vessel Name: ${vehicle.shippingStage.vesselName}`
            : null,
          vehicle.shippingStage.voyageNo
            ? `Voyage No: ${vehicle.shippingStage.voyageNo}`
            : null,
          vehicle.shippingStage.etd
            ? `ETD: ${new Date(vehicle.shippingStage.etd).toLocaleDateString()}`
            : null,
          vehicle.shippingStage.eta
            ? `ETA: ${new Date(vehicle.shippingStage.eta).toLocaleDateString()}`
            : null,
          vehicle.shippingStage.containerNumber
            ? `Container Number: ${vehicle.shippingStage.containerNumber}`
            : null,
          vehicle.shippingStage.containerSize
            ? `Container Size: ${vehicle.shippingStage.containerSize}`
            : null,
          vehicle.shippingStage.sealNumber
            ? `Seal Number: ${vehicle.shippingStage.sealNumber}`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      : ""

    const emailSubject = `Booking Request - ${vehicle.vin}${vehicle.make && vehicle.model ? ` - ${vehicle.make} ${vehicle.model}` : ""}`

    const emailBody = `Dear Shipping Agent,

We would like to request a booking for the following vehicle:

${vehicleDetails}

${bookingDetails ? `\nBooking Details:\n${bookingDetails}` : ""}

${vehicle.customer ? `\nCustomer Information:\nName: ${vehicle.customer.name}${vehicle.customer.email ? `\nEmail: ${vehicle.customer.email}` : ""}${vehicle.customer.phone ? `\nPhone: ${vehicle.customer.phone}` : ""}` : ""}

Please confirm the booking and provide us with the necessary details.

Thank you,
${session.user.name || "Zervtek Team"}`

    // Configure Gmail transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
      },
    })

    // Send email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: shippingAgentEmail,
      subject: emailSubject,
      text: emailBody,
    }

    await transporter.sendMail(mailOptions)

    // Update booking requested flag
    await prisma.vehicleShippingStage.upsert({
      where: {
        vehicleId_stage: {
          vehicleId: vehicleId,
          stage: "BOOKING",
        },
      },
      update: {
        bookingRequested: true,
      },
      create: {
        vehicleId: vehicleId,
        stage: "BOOKING",
        bookingRequested: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Booking request email sent successfully",
    })
  } catch (error: any) {
    console.error("Error sending booking email:", error)
    return NextResponse.json(
      {
        error: "Failed to send booking email",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
