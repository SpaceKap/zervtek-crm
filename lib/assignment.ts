import { prisma } from "./prisma"
import { InquiryStatus } from "@prisma/client"

/**
 * Release inquiries that have been assigned for more than 30 days
 * and are not in a converted state (CLOSED_WON)
 */
export async function releaseExpiredAssignments() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const expiredInquiries = await prisma.inquiry.findMany({
    where: {
      assignedToId: { not: null },
      assignedAt: { lte: thirtyDaysAgo },
      status: {
        not: InquiryStatus.CLOSED_WON,
      },
    },
  })

  const results = await Promise.all(
    expiredInquiries.map(async (inquiry) => {
      // Create history entry
      await prisma.inquiryHistory.create({
        data: {
          inquiryId: inquiry.id,
          userId: inquiry.assignedToId!,
          action: "AUTO_RELEASED",
          previousStatus: inquiry.status,
          newStatus: inquiry.status,
          notes: "Automatically released after 30 days without conversion",
        },
      })

      // Release the assignment
      return prisma.inquiry.update({
        where: { id: inquiry.id },
        data: {
          assignedToId: null,
          assignedAt: null,
        },
      })
    })
  )

  return {
    released: results.length,
    inquiries: results,
  }
}
