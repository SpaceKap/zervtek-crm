import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

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
      <nav className="bg-white dark:bg-[#1E1E1E] border-b border-gray-200 dark:border-[#2C2C2C] shadow-sm dark:shadow-none">
        <div className="w-full px-6">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-primary dark:text-[#D4AF37]">
                  dashboard
                </span>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  CRM
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="border-transparent text-gray-500 dark:text-[#A1A1A1] hover:border-gray-300 dark:hover:border-[#49454F] hover:text-gray-700 dark:hover:text-white inline-flex items-center gap-2 px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    inbox
                  </span>
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/kanban"
                  className="border-transparent text-gray-500 dark:text-[#A1A1A1] hover:border-gray-300 dark:hover:border-[#49454F] hover:text-gray-700 dark:hover:text-white inline-flex items-center gap-2 px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    view_kanban
                  </span>
                  Kanban Board
                </Link>
                <Link
                  href="/dashboard/invoices"
                  className="border-transparent text-gray-500 dark:text-[#A1A1A1] hover:border-gray-300 dark:hover:border-[#49454F] hover:text-gray-700 dark:hover:text-white inline-flex items-center gap-2 px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    receipt
                  </span>
                  Invoices
                </Link>
                {(session.user.role === "MANAGER" ||
                  session.user.role === "ADMIN") && (
                  <Link
                    href="/dashboard/stats"
                    className="border-transparent text-gray-500 dark:text-[#A1A1A1] hover:border-gray-300 dark:hover:border-[#49454F] hover:text-gray-700 dark:hover:text-white inline-flex items-center gap-2 px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      analytics
                    </span>
                    Stats
                  </Link>
                )}
                {session.user.role === "MANAGER" && (
                  <Link
                    href="/dashboard/manager"
                    className="border-transparent text-gray-500 dark:text-[#A1A1A1] hover:border-gray-300 dark:hover:border-[#49454F] hover:text-gray-700 dark:hover:text-white inline-flex items-center gap-2 px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      admin_panel_settings
                    </span>
                    Manager View
                  </Link>
                )}
                {session.user.role === "ADMIN" && (
                  <Link
                    href="/dashboard/admin"
                    className="border-transparent text-gray-500 dark:text-[#A1A1A1] hover:border-gray-300 dark:hover:border-[#49454F] hover:text-gray-700 dark:hover:text-white inline-flex items-center gap-2 px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      settings
                    </span>
                    Admin
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-gray-500 dark:text-[#A1A1A1]">
                  account_circle
                </span>
                <span className="text-sm text-gray-700 dark:text-white mr-4">
                  {session.user.name || session.user.email}
                </span>
              </div>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>
      <main className="w-full px-6 py-6 bg-gray-50 dark:bg-[#121212]">
        {children}
      </main>
    </div>
  );
}
