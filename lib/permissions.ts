import { UserRole } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth"

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

export async function requireRole(role: UserRole) {
  const user = await requireAuth()
  if (user.role !== role) {
    throw new Error("Forbidden")
  }
  return user
}

export async function requireManager() {
  return requireRole(UserRole.MANAGER)
}

export function canViewAllInquiries(userRole: UserRole): boolean {
  return userRole === UserRole.MANAGER || userRole === UserRole.ADMIN
}

export function canAssignInquiry(userRole: UserRole): boolean {
  return userRole === UserRole.SALES || userRole === UserRole.MANAGER || userRole === UserRole.ADMIN
}

export function canManageUsers(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN
}

export async function requireAdmin() {
  return requireRole(UserRole.ADMIN)
}

export function canCreateInvoice(userRole: UserRole): boolean {
  return (
    userRole === UserRole.SALES ||
    userRole === UserRole.MANAGER ||
    userRole === UserRole.ADMIN
  )
}

export function canApproveInvoice(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN
}

export function canFinalizeInvoice(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN
}

export function canEditInvoice(
  invoiceStatus: string,
  userRole: UserRole,
  isLocked: boolean = false,
): boolean {
  // Cannot edit locked invoices
  if (isLocked) {
    return false
  }
  // Cannot edit finalized invoices (even if unlocked)
  if (invoiceStatus === "FINALIZED") {
    return false
  }
  // Only admin can edit approved invoices
  if (invoiceStatus === "APPROVED" && userRole !== UserRole.ADMIN) {
    return false
  }
  // Sales and managers can edit drafts and pending approval
  return (
    userRole === UserRole.SALES ||
    userRole === UserRole.MANAGER ||
    userRole === UserRole.ADMIN
  )
}

export function canDeleteInvoice(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN
}

export function canDeleteSharedInvoice(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN
}
