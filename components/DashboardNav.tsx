"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { SignOutButton } from "./SignOutButton";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";
import { ThemeToggle } from "./ThemeToggle";
import { AssignmentNotificationCenter } from "./AssignmentNotificationCenter";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface DashboardNavProps {
  user: { name?: string | null; email?: string | null; role?: string };
}

const navItems = [
  { href: "/dashboard", icon: "inbox", label: "Dashboard" },
  { href: "/dashboard/stock-listings", icon: "directions_car", label: "Stock cars" },
  {
    href: "/dashboard/kanban",
    icon: "view_kanban",
    label: "Sales Pipeline",
    roles: ["MANAGER", "ADMIN", "SALES", "BACK_OFFICE_STAFF"],
  },
  {
    href: "/dashboard/shipping-kanban",
    icon: "local_shipping",
    label: "Shipping Pipeline",
    roles: ["MANAGER", "ADMIN", "BACK_OFFICE_STAFF", "ACCOUNTANT"],
  },
  { href: "/dashboard/financial-operations", icon: "account_balance_wallet", label: "Financial Operations" },
  { href: "/dashboard/stats", icon: "analytics", label: "Stats", roles: ["MANAGER", "ADMIN"] },
  { href: "/dashboard/admin", icon: "settings", label: "Admin", roles: ["ADMIN"] },
  { href: "/dashboard/accountant", icon: "calculate", label: "Accountant", roles: ["ACCOUNTANT"] },
];

export function DashboardNav({ user }: DashboardNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isPwaStandalone = useStandalonePwa();

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user.role || "");
  });

  const showAssignmentNotifications = user.role !== "ACCOUNTANT";

  const linkClass = (href: string) => {
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return cn(
      "flex items-center gap-3 rounded-lg px-4 text-base font-medium transition-colors",
      isPwaStandalone ? "min-h-12 py-3" : "py-3",
      isActive
        ? "bg-primary/10 text-primary"
        : "text-gray-600 dark:text-[#A1A1A1] hover:bg-gray-100 dark:hover:bg-[#2C2C2C]",
    );
  };

  return (
    <nav className="bg-white dark:bg-[#1E1E1E] border-b border-gray-200 dark:border-[#2C2C2C] shadow-sm dark:shadow-none">
      <div className="w-full px-4 sm:px-6">
        <div className="flex justify-between h-14 sm:h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex-shrink-0 flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl text-primary dark:text-[#D4AF37]">
                dashboard
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                CRM
              </h1>
            </Link>
            {/* Desktop nav */}
            <div className="hidden sm:ml-6 sm:flex sm:items-center sm:gap-1 sm:flex-wrap">
              {filteredItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                      ? "bg-primary/10 text-primary"
                      : "text-gray-500 dark:text-[#A1A1A1] hover:bg-gray-100 dark:hover:bg-[#2C2C2C] hover:text-gray-700 dark:hover:text-white"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              {isPwaStandalone && (
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:text-[#A1A1A1] dark:hover:bg-[#2C2C2C] dark:hover:text-white"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  Sign out
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {showAssignmentNotifications && <AssignmentNotificationCenter />}
            <ThemeToggle />
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <span className="material-symbols-outlined text-lg text-gray-500 dark:text-[#A1A1A1]">
                account_circle
              </span>
              <span className="text-sm text-gray-700 dark:text-white">
                {user.name || user.email}
              </span>
            </div>
            {!isPwaStandalone && <SignOutButton />}
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden h-10 w-10 shrink-0"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 sm:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className={cn(
              "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-xl dark:bg-[#1E1E1E] sm:hidden",
              isPwaStandalone &&
                "pb-[max(1rem,env(safe-area-inset-bottom,0px))] pl-[max(0px,env(safe-area-inset-left,0px))]",
            )}
          >
            <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-[#2C2C2C]">
              <span className="font-semibold">Menu</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {filteredItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={linkClass(item.href)}
                >
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="border-t border-gray-200 p-4 dark:border-[#2C2C2C]">
              <div className="mb-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-xl text-gray-500 dark:text-[#A1A1A1]">
                  account_circle
                </span>
                <span className="truncate text-sm text-gray-700 dark:text-white">
                  {user.name || user.email}
                </span>
              </div>
              <SignOutButton
                className={
                  isPwaStandalone
                    ? "h-11 w-full touch-manipulation justify-center"
                    : undefined
                }
              />
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
