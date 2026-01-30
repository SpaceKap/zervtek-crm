import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1E1E1E] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Invoice Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          The invoice you&apos;re looking for doesn&apos;t exist or is no longer
          available.
        </p>
        <Link href="/">
          <Button>Go to Home</Button>
        </Link>
      </div>
    </div>
  );
}
