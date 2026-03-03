import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#121212] px-4">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gray-100 dark:bg-[#2C2C2C] flex items-center justify-center mx-auto mb-6 ring-4 ring-gray-200/50 dark:ring-white/5">
          <span
            className="material-symbols-outlined text-4xl sm:text-5xl text-gray-500 dark:text-[#A1A1A1]"
            aria-hidden
          >
            search_off
          </span>
        </div>
        <p className="text-sm font-medium text-primary dark:text-[#D4AF37] uppercase tracking-wider mb-2">
          404
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Page not found
        </h1>
        <p className="text-gray-600 dark:text-[#A1A1A1] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button asChild size="lg" className="gap-2 min-w-[180px]">
            <Link href="/dashboard">
              <span className="material-symbols-outlined text-lg">dashboard</span>
              Go to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2 min-w-[180px]">
            <Link href="/">
              <span className="material-symbols-outlined text-lg">home</span>
              Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
