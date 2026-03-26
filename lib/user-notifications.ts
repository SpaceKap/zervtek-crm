import { prisma } from "@/lib/prisma"

export const NOTIFICATION_TYPE_INQUIRY_ASSIGNED = "INQUIRY_ASSIGNED"

function countryFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null
  const c = (metadata as Record<string, unknown>).country
  return typeof c === "string" && c.trim() ? c.trim() : null
}

function resolveLookingFor(lookingFor: string | null | undefined, metadata: unknown): string | null {
  if (lookingFor?.trim()) return lookingFor.trim()
  if (!metadata || typeof metadata !== "object") return null
  const x = (metadata as Record<string, unknown>).lookingFor
  return typeof x === "string" && x.trim() ? x.trim() : null
}

function truncateText(s: string | null | undefined, max: number): string {
  if (!s) return ""
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/**
 * Notifies the assignee when someone else assigns them an inquiry.
 * Skips self-assignment and duplicate same-assignee updates.
 */
export async function createInquiryAssignedNotification(params: {
  assigneeId: string
  assignerId: string
  inquiryId: string
  customerName: string | null
  lookingFor: string | null
  metadata: unknown
}): Promise<void> {
  const { assigneeId, assignerId, inquiryId, customerName, lookingFor, metadata } = params

  if (assigneeId === assignerId) return

  const country = countryFromMetadata(metadata)
  const customer = (customerName?.trim() || "Customer").trim()
  const title = country ? `${customer} (${country})` : customer
  const lf = truncateText(resolveLookingFor(lookingFor, metadata), 120)
  const body = lf ? `${lf} has been assigned to you.` : "An inquiry has been assigned to you."

  await prisma.userNotification.create({
    data: {
      userId: assigneeId,
      type: NOTIFICATION_TYPE_INQUIRY_ASSIGNED,
      title,
      body,
      link: `/dashboard/inquiries/${inquiryId}`,
      inquiryId,
      actorUserId: assignerId,
    },
  })
}
