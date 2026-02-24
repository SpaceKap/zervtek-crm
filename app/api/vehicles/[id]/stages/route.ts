import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageVehicleStages } from "@/lib/permissions"
import { ShippingStage, BookingType, BookingStatus } from "@prisma/client"
import { convertDecimalsToNumbers } from "@/lib/decimal"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: {
        inquiry: {
          select: {
            id: true,
            customerName: true,
            status: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            customerId: true,
            costInvoice: {
              select: {
                totalCost: true,
                totalRevenue: true,
                profit: true,
                costItems: {
                  select: {
                    id: true,
                    description: true,
                    amount: true,
                    category: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        shippingStage: {
          include: {
            yard: {
              select: {
                id: true,
                name: true,
              },
            },
            purchaseVendor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            transportVendor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            repairVendor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            forwardingVendor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            freightVendor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        stageHistory: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      )
    }

    // Sync customer from invoice when vehicle has no customer but invoices do
    if (!vehicle.customerId && vehicle.invoices?.length) {
      const invoiceWithCustomer = vehicle.invoices.find(
        (inv: { customerId: string | null }) => inv.customerId
      )
      if (invoiceWithCustomer?.customerId) {
        await prisma.vehicle.update({
          where: { id: params.id },
          data: { customerId: invoiceWithCustomer.customerId },
        })
        const syncedCustomer = await prisma.customer.findUnique({
          where: { id: invoiceWithCustomer.customerId },
          select: { id: true, name: true, email: true, phone: true },
        })
        vehicle = {
          ...vehicle,
          customerId: invoiceWithCustomer.customerId,
          customer: syncedCustomer,
        }
      }
    }

    return NextResponse.json(convertDecimalsToNumbers(vehicle))
  } catch (error) {
    console.error("Error fetching vehicle stage:", error)
    return NextResponse.json(
      { error: "Failed to fetch vehicle stage" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageVehicleStages(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const raw = body as Record<string, unknown>
    // Normalize empty strings to null for optional IDs and enums so Prisma doesn't fail
    const emptyToNull = (v: unknown) => (v === "" ? null : v)
    const {
      stage,
      purchaseVendorId: rawPurchaseVendorId,
      purchasePaid,
      purchasePaymentDeadline,
      purchasePaymentDate,
      yardId: rawYardId,
      transportArranged,
      yardNotified,
      photosRequested,
      transportVendorId: rawTransportVendorId,
      repairSkipped,
      repairVendorId: rawRepairVendorId,
      numberPlatesReceived,
      deregistrationComplete,
      exportCertificateUploaded,
      deregistrationSentToAuction,
      insuranceRefundClaimed,
      spareKeysReceived,
      maintenanceRecordsReceived,
      manualsReceived,
      cataloguesReceived,
      accessoriesReceived,
      otherItemsReceived,
      bookingType: rawBookingType,
      bookingRequested,
      bookingStatus: rawBookingStatus,
      bookingNumber,
      pod,
      pol,
      vesselName,
      voyageNo,
      etd,
      eta,
      notes,
      containerNumber,
      containerSize,
      sealNumber,
      unitsInside,
      siEcSentToForwarder,
      shippingOrderReceived,
      forwardingVendorId: rawForwardingVendorId,
      freightVendorId: rawFreightVendorId,
      blCopyUploaded,
      blDetailsConfirmed,
      blPaid,
      lcCopyUploaded,
      exportDeclarationUploaded,
      recycleApplied,
      blReleaseNotice,
      blReleased,
      dhlTracking,
    } = raw
    const purchaseVendorId = emptyToNull(rawPurchaseVendorId) as string | null
    const yardId = rawYardId
    const transportVendorId = emptyToNull(rawTransportVendorId) as string | null
    const repairVendorId = emptyToNull(rawRepairVendorId) as string | null
    const freightVendorId = emptyToNull(rawFreightVendorId) as string | null
    const forwardingVendorId = emptyToNull(rawForwardingVendorId) as string | null
    const bookingType = emptyToNull(rawBookingType) as BookingType | null
    const bookingStatus = emptyToNull(rawBookingStatus) as BookingStatus | null

    // Get current vehicle and stage
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      include: { shippingStage: true },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      )
    }

    const previousStage = vehicle.currentShippingStage || vehicle.shippingStage?.stage

    // Update or create shipping stage
    const updateData: any = {}
    if (stage !== undefined) updateData.stage = stage
    if (purchaseVendorId !== undefined) updateData.purchaseVendorId = purchaseVendorId
    if (purchasePaid !== undefined) updateData.purchasePaid = purchasePaid
    if (purchasePaymentDeadline !== undefined) updateData.purchasePaymentDeadline = purchasePaymentDeadline ? new Date(purchasePaymentDeadline) : null
    if (purchasePaymentDate !== undefined) updateData.purchasePaymentDate = purchasePaymentDate ? new Date(purchasePaymentDate) : null
    if (yardId !== undefined) {
      // Handle vendor-based yards (IDs starting with "vendor-")
      if (yardId && typeof yardId === "string" && yardId.startsWith("vendor-")) {
        const vendorId = yardId.replace("vendor-", "");
        // Find or create a Yard record for this vendor
        let yard = await prisma.yard.findFirst({
          where: { vendorId },
        });
        if (!yard) {
          // Get vendor name to create yard
          const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
            select: { name: true, email: true },
          });
          if (vendor) {
            try {
              yard = await prisma.yard.create({
                data: {
                  name: vendor.name,
                  vendorId: vendorId,
                  email: vendor.email || null,
                },
              });
            } catch (error: any) {
              // If yard with same name exists, find it
              if (error.code === "P2002") {
                yard = await prisma.yard.findFirst({
                  where: { name: vendor.name },
                });
              }
            }
          }
        }
        updateData.yardId = yard?.id || null;
      } else if (yardId) {
        updateData.yardId = yardId;
      } else {
        updateData.yardId = null;
      }
    }
    if (transportArranged !== undefined) updateData.transportArranged = transportArranged
    if (yardNotified !== undefined) updateData.yardNotified = yardNotified
    if (photosRequested !== undefined) updateData.photosRequested = photosRequested
    if (transportVendorId !== undefined) updateData.transportVendorId = transportVendorId
    if (repairSkipped !== undefined) {
      updateData.repairSkipped = repairSkipped
      // If skipping repair, ensure we don't have a repair vendor
      if (repairSkipped) {
        updateData.repairVendorId = null
      }
    }
    if (repairVendorId !== undefined) updateData.repairVendorId = repairVendorId
    if (numberPlatesReceived !== undefined) updateData.numberPlatesReceived = numberPlatesReceived
    if (deregistrationComplete !== undefined) updateData.deregistrationComplete = deregistrationComplete
    if (exportCertificateUploaded !== undefined) updateData.exportCertificateUploaded = exportCertificateUploaded
    if (deregistrationSentToAuction !== undefined) updateData.deregistrationSentToAuction = deregistrationSentToAuction
    if (insuranceRefundClaimed !== undefined) updateData.insuranceRefundClaimed = insuranceRefundClaimed
    if (spareKeysReceived !== undefined) updateData.spareKeysReceived = spareKeysReceived
    if (maintenanceRecordsReceived !== undefined) updateData.maintenanceRecordsReceived = maintenanceRecordsReceived
    if (manualsReceived !== undefined) updateData.manualsReceived = manualsReceived
    if (cataloguesReceived !== undefined) updateData.cataloguesReceived = cataloguesReceived
    if (accessoriesReceived !== undefined) updateData.accessoriesReceived = accessoriesReceived
    if (otherItemsReceived !== undefined) updateData.otherItemsReceived = otherItemsReceived
    if (bookingType !== undefined) updateData.bookingType = bookingType
    if (bookingRequested !== undefined) updateData.bookingRequested = bookingRequested
    if (bookingStatus !== undefined) updateData.bookingStatus = bookingStatus
    if (bookingNumber !== undefined) updateData.bookingNumber = bookingNumber
    if (pod !== undefined) updateData.pod = pod
    if (pol !== undefined) updateData.pol = pol
    if (vesselName !== undefined) updateData.vesselName = vesselName
    if (voyageNo !== undefined) updateData.voyageNo = voyageNo
    if (etd !== undefined) updateData.etd = etd ? new Date(etd) : null
    if (eta !== undefined) updateData.eta = eta ? new Date(eta) : null
    if (notes !== undefined) updateData.notes = notes
    if (containerNumber !== undefined) updateData.containerNumber = containerNumber
    if (containerSize !== undefined) updateData.containerSize = containerSize
    if (sealNumber !== undefined) updateData.sealNumber = sealNumber
    if (unitsInside !== undefined) {
      const parsed = unitsInside === "" || unitsInside == null ? null : parseInt(String(unitsInside), 10)
      updateData.unitsInside = Number.isNaN(parsed) ? null : parsed
    }
    if (siEcSentToForwarder !== undefined) updateData.siEcSentToForwarder = siEcSentToForwarder
    if (shippingOrderReceived !== undefined) updateData.shippingOrderReceived = shippingOrderReceived
    if (forwardingVendorId !== undefined) updateData.forwardingVendorId = forwardingVendorId
    if (freightVendorId !== undefined) updateData.freightVendorId = freightVendorId
    if (blCopyUploaded !== undefined) updateData.blCopyUploaded = blCopyUploaded
    if (blDetailsConfirmed !== undefined) updateData.blDetailsConfirmed = blDetailsConfirmed
    if (blPaid !== undefined) updateData.blPaid = blPaid
    if (lcCopyUploaded !== undefined) updateData.lcCopyUploaded = lcCopyUploaded
    if (exportDeclarationUploaded !== undefined) updateData.exportDeclarationUploaded = exportDeclarationUploaded
    if (recycleApplied !== undefined) updateData.recycleApplied = recycleApplied
    if (blReleaseNotice !== undefined) updateData.blReleaseNotice = blReleaseNotice
    if (blReleased !== undefined) updateData.blReleased = blReleased
    if (dhlTracking !== undefined) updateData.dhlTracking = dhlTracking

    let updatedStage
    try {
      updatedStage = await prisma.vehicleShippingStage.upsert({
        where: { vehicleId: params.id },
        update: updateData,
        create: {
          vehicleId: params.id,
          stage: stage || "PURCHASE",
          ...updateData,
        },
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save stage"
      console.error("Stage PATCH upsert error:", err)
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // Update vehicle's current stage if changed
    if (stage && stage !== previousStage) {
      await prisma.vehicle.update({
        where: { id: params.id },
        data: { currentShippingStage: stage },
      })

      // Create history entry
      await prisma.vehicleStageHistory.create({
        data: {
          vehicleId: params.id,
          userId: session.user.id,
          previousStage: previousStage || null,
          newStage: stage,
          action: `Stage changed from ${previousStage || "N/A"} to ${stage}`,
          notes: body.notes || null,
        },
      })
    }

    return NextResponse.json(convertDecimalsToNumbers(updatedStage))
  } catch (error) {
    console.error("Error updating vehicle stage:", error)
    return NextResponse.json(
      { error: "Failed to update vehicle stage" },
      { status: 500 }
    )
  }
}
