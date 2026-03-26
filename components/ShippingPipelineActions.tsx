"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShippingKanbanFilter } from "@/components/ShippingKanbanFilter";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface ShippingPipelineActionsProps {
  canCreateInvoice: boolean;
  canFilter: boolean;
  users: User[];
}

export function ShippingPipelineActions({
  canCreateInvoice,
  canFilter,
  users,
}: ShippingPipelineActionsProps) {
  const isPwa = useStandalonePwa();

  return (
    <div className="flex items-center gap-2">
      {canCreateInvoice && (
        <Link href="/dashboard/invoices/new">
          <Button
            className={isPwa ? "h-10 w-10 rounded-full p-0" : "inline-flex items-center gap-2"}
            aria-label="Create invoice"
          >
            <span className="material-symbols-outlined">add</span>
            {!isPwa && "Create Invoice"}
          </Button>
        </Link>
      )}
      {canFilter && <ShippingKanbanFilter users={users} />}
    </div>
  );
}

