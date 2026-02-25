"use client";

import { useRouter } from "next/navigation";
import { RecordDepositForm } from "@/components/RecordDepositForm";

export function RecordDepositFormWrapper({
  bankDetails,
}: {
  bankDetails: Record<string, string> | null;
}) {
  const router = useRouter();
  return (
    <RecordDepositForm
      bankDetails={bankDetails}
      onSuccess={() => router.refresh()}
    />
  );
}
