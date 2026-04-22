import { InquiryPool } from "@/components/InquiryPool"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export default async function InquiriesPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const isManager = session.user.role === UserRole.MANAGER || session.user.role === UserRole.ADMIN
  const canAssign =
    session.user.role === UserRole.SALES ||
    session.user.role === UserRole.MANAGER ||
    session.user.role === UserRole.ADMIN ||
    session.user.role === UserRole.BACK_OFFICE_STAFF

  let users: Array<{ id: string; name: string | null; email: string }> = []
  if (isManager || session.user.role === UserRole.BACK_OFFICE_STAFF) {
    users = await prisma.user.findMany({
      where: {
        role: {
          in: [
            UserRole.SALES,
            UserRole.MANAGER,
            UserRole.ADMIN,
            UserRole.BACK_OFFICE_STAFF,
          ],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="material-symbols-outlined text-3xl text-primary dark:text-[#D4AF37] sm:text-4xl">
          inbox
        </span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Inquiry Pool
        </h1>
      </div>
      <InquiryPool
        isManager={isManager}
        canAssign={canAssign}
        users={users}
        showUnassignedOnly={!isManager}
        currentUserId={session.user.id}
      />
    </div>
  )
}
