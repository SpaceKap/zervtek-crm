import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardNav } from "@/components/DashboardNav";

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
      <main className="w-full px-4 sm:px-6 py-4 sm:py-6 bg-gray-50 dark:bg-[#121212]">
        {children}
      </main>
    </div>
  );
}
