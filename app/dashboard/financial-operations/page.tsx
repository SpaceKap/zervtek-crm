import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/permissions";
import { FinancialOperationsView } from "@/components/FinancialOperationsView";

export default async function FinancialOperationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  await requireAuth();

  return <FinancialOperationsView currentUser={session.user} />;
}
