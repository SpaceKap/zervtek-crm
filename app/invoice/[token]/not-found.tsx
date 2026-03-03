import { ResourceNotFound } from "@/components/ResourceNotFound";

export default function PublicInvoiceNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1E1E1E] flex items-center justify-center px-4">
      <ResourceNotFound
        variant="invoice"
        description="This invoice doesn't exist or is no longer available."
        backHref="/"
        backLabel="Go to Home"
        fullPage={false}
      />
    </div>
  );
}
