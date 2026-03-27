"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChargeTypeForm } from "./ChargeTypeForm";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";
import { cn } from "@/lib/utils";

interface ChargeType {
  id: string;
  name: string;
  category:
    | "EXPORT_FEES"
    | "SHIPPING"
    | "ADDITIONAL_TRANSPORT"
    | "RECYCLE_FEES"
    | "CUSTOM";
  createdAt: string;
}

const categoryLabels: Record<string, string> = {
  EXPORT_FEES: "Export Fees",
  SHIPPING: "Shipping",
  ADDITIONAL_TRANSPORT: "Additional Transport",
  RECYCLE_FEES: "Recycle Fees",
  CUSTOM: "Custom",
};

export function ChargeTypesList() {
  const isPwa = useStandalonePwa();
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingChargeType, setEditingChargeType] = useState<ChargeType | null>(
    null,
  );

  useEffect(() => {
    fetchChargeTypes();
  }, []);

  const fetchChargeTypes = async () => {
    try {
      const response = await fetch("/api/charge-types");
      if (response.ok) {
        const data = await response.json();
        setChargeTypes(data);
      }
    } catch (error) {
      console.error("Error fetching charge types:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingChargeType(null);
    setShowForm(true);
  };

  const handleEdit = (chargeType: ChargeType) => {
    setEditingChargeType(chargeType);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this charge type?")) {
      return;
    }

    try {
      const response = await fetch(`/api/charge-types/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchChargeTypes();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error deleting charge type:", error);
      alert("Failed to delete charge type");
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingChargeType(null);
    fetchChargeTypes();
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader className={cn(isPwa && "space-y-3 pb-3")}>
          <div
            className={cn(
              "flex gap-3",
              isPwa
                ? "flex-col items-stretch"
                : "items-center justify-between",
            )}
          >
            <div className="min-w-0">
              <CardTitle>Charge Types</CardTitle>
              <CardDescription>
                Manage charge types for customer invoices
              </CardDescription>
            </div>
            <Button
              onClick={handleCreate}
              className={cn(isPwa && "w-full shrink-0 sm:w-auto")}
            >
              <span className="material-symbols-outlined mr-2 text-lg">
                add
              </span>
              {isPwa ? "Add" : "Add Charge Type"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className={cn(isPwa && "px-3 sm:px-6")}>
          {chargeTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No charge types found
            </div>
          ) : (
            <div className={cn("space-y-2", isPwa && "space-y-3")}>
              {chargeTypes.map((chargeType) => (
                <div
                  key={chargeType.id}
                  className={cn(
                    "rounded-lg border p-3 hover:bg-accent",
                    isPwa
                      ? "flex flex-col gap-3"
                      : "flex items-center justify-between",
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-medium">{chargeType.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {categoryLabels[chargeType.category]}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex gap-2",
                      isPwa && "w-full justify-end sm:w-auto sm:justify-start",
                    )}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(chargeType)}
                      className={cn(isPwa && "min-h-[40px] flex-1 sm:flex-none")}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(chargeType.id)}
                      className={cn(isPwa && "min-h-[40px] flex-1 sm:flex-none")}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <ChargeTypeForm
          chargeType={editingChargeType}
          onClose={handleFormClose}
        />
      )}
    </>
  );
}
