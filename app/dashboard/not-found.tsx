import { ResourceNotFound } from "@/components/ResourceNotFound";

export default function DashboardNotFound() {
  return (
    <ResourceNotFound
      variant="page"
      backHref="/dashboard"
      backLabel="Go to Dashboard"
      fullPage={true}
    />
  );
}
