import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requireAuth, canViewAllInquiries } from "@/lib/permissions";
import { CombinedInvoicesView } from "@/components/CombinedInvoicesView";

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  await requireAuth();

  return <CombinedInvoicesView currentUser={session.user} />;
}
