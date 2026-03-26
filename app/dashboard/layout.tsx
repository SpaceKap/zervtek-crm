import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardNav } from "@/components/DashboardNav";
import { InquiryNotificationPoller } from "@/components/InquiryNotificationPoller";
import { PwaClientExperience } from "@/components/PwaClientExperience";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212]">
      <DashboardNav user={session.user} />
      <InquiryNotificationPoller user={session.user} />
      <PwaClientExperience userRole={session.user.role} />
      <main className="w-full px-4 sm:px-6 py-4 sm:py-6 bg-gray-50 dark:bg-[#121212]">
        {children}
      </main>
    </div>
  );
}
