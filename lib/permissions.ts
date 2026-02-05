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
  return userRole === UserRole.MANAGER || userRole === UserRole.ADMIN || userRole === UserRole.ACCOUNTANT
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
  // Cannot edit locked invoices (sales/managers cannot edit when locked by admin)
  if (isLocked && userRole !== UserRole.ADMIN) {
    return false
  }
  // Cannot edit finalized invoices (even if unlocked)
  if (invoiceStatus === "FINALIZED") {
    return false
  }
  // Sales, managers, and admins can edit all non-finalized invoices when not locked
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

export function canViewVehicles(userRole: UserRole): boolean {
  return (
    userRole === UserRole.MANAGER ||
    userRole === UserRole.ADMIN ||
    userRole === UserRole.BACK_OFFICE_STAFF ||
    userRole === UserRole.ACCOUNTANT
  )
}

export function canViewTransactions(userRole: UserRole): boolean {
  return (
    userRole === UserRole.MANAGER ||
    userRole === UserRole.ADMIN ||
    userRole === UserRole.ACCOUNTANT
  )
}

export function canManageTransactions(userRole: UserRole): boolean {
  return (
    userRole === UserRole.MANAGER ||
    userRole === UserRole.ADMIN ||
    userRole === UserRole.ACCOUNTANT
  )
}

export function canManageVehicleStages(userRole: UserRole): boolean {
  return (
    userRole === UserRole.MANAGER ||
    userRole === UserRole.ADMIN ||
    userRole === UserRole.BACK_OFFICE_STAFF
  )
}
