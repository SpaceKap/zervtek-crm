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

  // Get all users for manager/admin assignment
  let users: Array<{ id: string; name: string | null; email: string }> = []
  if (isManager) {
    users = await prisma.user.findMany({
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
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-4xl text-primary dark:text-[#D4AF37]">inbox</span>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inquiry Pool</h1>
          <p className="text-muted-foreground">
            Pick inquiries from the pool to start working on them
          </p>
        </div>
      </div>
      <InquiryPool
        isManager={isManager}
        users={users}
        showUnassignedOnly={!isManager}
        currentUserId={session.user.id}
      />
    </div>
  )
}
