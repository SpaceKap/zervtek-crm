import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/permissions"
import { DepositLinkForm } from "@/components/DepositLinkForm"

export default async function DepositLinkPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  await requireAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Request deposit
        </h1>
      </div>
      <DepositLinkForm />
    </div>
  )
}
