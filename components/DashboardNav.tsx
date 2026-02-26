"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";

interface DashboardNavProps {
  user: { name?: string | null; email?: string | null; role?: string };
}

const navItems = [
  { href: "/dashboard", icon: "inbox", label: "Dashboard" },
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

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user.role || "");
  });

  const linkClass = (href: string) => {
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return `flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors ${
      isActive
        ? "bg-primary/10 text-primary"
        : "text-gray-600 dark:text-[#A1A1A1] hover:bg-gray-100 dark:hover:bg-[#2C2C2C]"
    }`;
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
            <div className="hidden sm:ml-6 sm:flex sm:items-center sm:gap-1">
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
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <span className="material-symbols-outlined text-lg text-gray-500 dark:text-[#A1A1A1]">
                account_circle
              </span>
              <span className="text-sm text-gray-700 dark:text-white">
                {user.name || user.email}
              </span>
            </div>
            <SignOutButton />
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
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-[#1E1E1E] shadow-xl sm:hidden flex flex-col">
            <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-[#2C2C2C]">
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
            <div className="p-4 border-t border-gray-200 dark:border-[#2C2C2C]">
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-xl text-gray-500 dark:text-[#A1A1A1]">
                  account_circle
                </span>
                <span className="text-sm text-gray-700 dark:text-white truncate">
                  {user.name || user.email}
                </span>
              </div>
              <SignOutButton />
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
