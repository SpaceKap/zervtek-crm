"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface CopyInquiryButtonProps {
  inquiryId: string;
}

export function CopyInquiryButton({ inquiryId }: CopyInquiryButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inquiries/${inquiryId}/copy`, {
        method: "POST",
      });

      if (response.ok) {
        const copy = await response.json();
        router.push(`/dashboard/inquiries/${copy.id}`);
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to copy inquiry");
      }
    } catch (error) {
      console.error("Error copying inquiry:", error);
      alert("Failed to copy inquiry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleCopy}
      disabled={loading}
      className="flex items-center gap-2"
    >
      <span className="material-symbols-outlined text-lg">content_copy</span>
      {loading ? "Copying..." : "Copy Inquiry"}
    </Button>
  );
}
