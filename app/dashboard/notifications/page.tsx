import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { AssignmentNotificationsPageClient } from "@/components/AssignmentNotificationsPageClient";

export default async function AssignmentNotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  if (session.user.role === UserRole.ACCOUNTANT) {
    redirect("/dashboard");
  }

  return <AssignmentNotificationsPageClient />;
}
