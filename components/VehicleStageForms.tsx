"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ShippingStage, BookingType, BookingStatus } from "@prisma/client";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { VehicleCostsManager } from "./VehicleCostsManager";
import { QuickDocumentUploadDialog } from "./QuickDocumentUploadDialog";
import { QuickChargeDialog } from "./QuickChargeDialog";
import { VendorForm } from "./VendorForm";
import { DocumentCategory, VendorCategory } from "@prisma/client";
import { DatePicker } from "@/components/ui/date-picker";

interface Vendor {
  id: string;
  name: string;
  email: string | null;
  category?: string;
}

interface Yard {
  id: string;
  name: string;
  vendor: Vendor | null;
}

interface VehicleShippingStage {
  id: string;
  stage: ShippingStage;
  purchaseVendorId: string | null;
  purchasePaid: boolean;
  purchasePaymentDeadline: Date | null;
  purchasePaymentDate: Date | null;
  yardId: string | null;
  transportArranged: boolean;
  yardNotified: boolean;
  photosRequested: boolean;
  transportVendorId: string | null;
  repairSkipped: boolean;
  repairVendorId: string | null;
  numberPlatesReceived: boolean | null;
  deregistrationComplete: boolean | null;
  exportCertificateUploaded: boolean;
  deregistrationSentToAuction: boolean | null;
  insuranceRefundClaimed: boolean | null;
  spareKeysReceived: boolean;
  maintenanceRecordsReceived: boolean;
  manualsReceived: boolean;
  cataloguesReceived: boolean;
  accessoriesReceived: boolean;
  otherItemsReceived: boolean;
  bookingType: BookingType | null;
  bookingRequested: boolean;
  bookingStatus: BookingStatus | null;
  bookingNumber: string | null;
  pod: string | null;
  pol: string | null;
  vesselName: string | null;
  voyageNo: string | null;
  etd: Date | null;
  eta: Date | null;
  notes: string | null;
  containerNumber: string | null;
  containerSize: string | null;
  sealNumber: string | null;
  unitsInside: number | null;
  siEcSentToForwarder: boolean;
  shippingOrderReceived: boolean;
  freightVendorId: string | null;
  blCopyUploaded: boolean;
  blDetailsConfirmed: boolean;
  blPaid: boolean;
  lcCopyUploaded: boolean;
  exportDeclarationUploaded: boolean;
  recycleApplied: boolean;
  blReleased: boolean;
  dhlTracking: string | null;
}

interface VehicleStageFormData {
  purchaseVendorId: string;
  purchasePaid: boolean;
  purchasePaymentDeadline: string;
  purchasePaymentDate: string;
  yardId: string;
  transportArranged: boolean;
  yardNotified: boolean;
  photosRequested: boolean;
  transportVendorId: string;
  repairSkipped: boolean;
  repairVendorId: string;
  numberPlatesReceived: boolean;
  deregistrationComplete: boolean;
  exportCertificateUploaded: boolean;
  deregistrationSentToAuction: boolean;
  insuranceRefundClaimed: boolean;
  spareKeysReceived: boolean;
  maintenanceRecordsReceived: boolean;
  manualsReceived: boolean;
  cataloguesReceived: boolean;
  accessoriesReceived: boolean;
  otherItemsReceived: boolean;
  bookingType: string;
  bookingRequested: boolean;
  bookingStatus: string;
  bookingNumber: string;
  pod: string;
  pol: string;
  vesselName: string;
  voyageNo: string;
  etd: string;
  eta: string;
  notes: string;
  containerNumber: string;
  containerSize: string;
  sealNumber: string;
  unitsInside: string;
  siEcSentToForwarder: boolean;
  shippingOrderReceived: boolean;
  freightVendorId: string;
  blCopyUploaded: boolean;
  blDetailsConfirmed: boolean;
  blPaid: boolean;
  lcCopyUploaded: boolean;
  exportDeclarationUploaded: boolean;
  recycleApplied: boolean;
  blReleased: boolean;
  dhlTracking: string;
}

interface VehicleStageFormsProps {
  vehicleId: string;
  currentStage: ShippingStage;
  stageData: VehicleShippingStage | null;
  vendors: Vendor[];
  yards: Yard[];
  isRegistered: boolean | null;
  vehicle?: {
    vin: string;
    stockNo: string | null;
    make: string | null;
    model: string | null;
    year: number | null;
    chassisNo: string | null;
    auctionHouse: string | null;
    lotNo: string | null;
    purchaseDate: Date | null;
  } | null;
  onUpdate: () => void;
  /** Optional: update vehicle in parent state without refetch (e.g. isRegistered). Avoids full-page refresh. */
  onVehiclePatch?: (patch: { isRegistered?: boolean | null }) => void;
  /** Call when a document is uploaded from stage (so parent can refresh Documents tab). */
  onDocumentUploaded?: () => void;
  /** Call after creating a vendor so the parent can refetch the vendors list. */
  onRefetchVendors?: () => void | Promise<void>;
  /** Call after creating a yard (or vendor with category YARD) so the parent can refetch the yards list. */
  onRefetchYards?: () => void | Promise<void>;
}

type AddVendorForField =
  | "purchaseVendorId"
  | "yardId"
  | "repairVendorId"
  | "freightVendorId"
  | null;

export function VehicleStageForms({
  vehicleId,
  currentStage,
  stageData,
  vendors,
  yards,
  isRegistered,
  vehicle,
  onUpdate,
  onVehiclePatch,
  onDocumentUploaded,
  onRefetchVendors,
  onRefetchYards,
}: VehicleStageFormsProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<VehicleStageFormData>>({});
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);
  const previousFormDataRef = useRef<Partial<VehicleStageFormData>>({});
  /** Sync from server only once per vehicle load. Never overwrite formData on refetch (e.g. after add fee, document upload, or Save) so checkboxes and vendors don't disappear. */
  const hasSyncedForVehicleRef = useRef(false);
  const lastVehicleIdRef = useRef<string>(vehicleId);
  const [documentUploadDialogOpen, setDocumentUploadDialogOpen] =
    useState(false);
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false);
  const [pendingDocumentCategory, setPendingDocumentCategory] =
    useState<DocumentCategory | null>(null);
  const [pendingChargeType, setPendingChargeType] = useState<string>("");
  const [pendingVendorId, setPendingVendorId] = useState<string | null>(null);
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [addVendorForField, setAddVendorForField] =
    useState<AddVendorForField>(null);
  const [addVendorInitialCategory, setAddVendorInitialCategory] =
    useState<VendorCategory>(VendorCategory.DEALERSHIP);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  /** Bump to refresh Stage Costs list after adding via QuickChargeDialog (e.g. Inland Transport, Photo Inspection). */
  const [stageCostsRefreshTrigger, setStageCostsRefreshTrigger] = useState(0);

  // Build full PATCH body: normalize empty strings to null for optional IDs/enums so API accepts it
  const buildStagePayload = useCallback(
    (data: Partial<VehicleStageFormData>) => {
      const emptyToNull = (v: string | undefined) => (v === "" || v === undefined ? null : v);
      const num = (v: string | number | undefined) => {
        if (v === "" || v === undefined) return null;
        const n = typeof v === "number" ? v : parseInt(String(v), 10);
        return Number.isNaN(n) ? null : n;
      };
      return {
        stage: currentStage,
        purchaseVendorId: emptyToNull(data.purchaseVendorId),
        purchasePaid: data.purchasePaid ?? false,
        purchasePaymentDeadline: data.purchasePaymentDeadline || null,
        purchasePaymentDate: data.purchasePaymentDate || null,
        yardId: data.yardId === "" ? null : (data.yardId ?? null),
        transportArranged: data.transportArranged ?? false,
        yardNotified: data.yardNotified ?? false,
        photosRequested: data.photosRequested ?? false,
        transportVendorId: emptyToNull(data.transportVendorId),
        repairSkipped: data.repairSkipped ?? false,
        repairVendorId: emptyToNull(data.repairVendorId),
        numberPlatesReceived: data.numberPlatesReceived ?? false,
        deregistrationComplete: data.deregistrationComplete ?? false,
        exportCertificateUploaded: data.exportCertificateUploaded ?? false,
        deregistrationSentToAuction: data.deregistrationSentToAuction ?? false,
        insuranceRefundClaimed: data.insuranceRefundClaimed ?? false,
        spareKeysReceived: data.spareKeysReceived ?? false,
        maintenanceRecordsReceived: data.maintenanceRecordsReceived ?? false,
        manualsReceived: data.manualsReceived ?? false,
        cataloguesReceived: data.cataloguesReceived ?? false,
        accessoriesReceived: data.accessoriesReceived ?? false,
        otherItemsReceived: data.otherItemsReceived ?? false,
        bookingType: emptyToNull(data.bookingType),
        bookingRequested: data.bookingRequested ?? false,
        bookingStatus: emptyToNull(data.bookingStatus),
        bookingNumber: data.bookingNumber || null,
        pod: data.pod || null,
        pol: data.pol || null,
        vesselName: data.vesselName || null,
        voyageNo: data.voyageNo || null,
        etd: data.etd || null,
        eta: data.eta || null,
        notes: data.notes || null,
        containerNumber: data.containerNumber || null,
        containerSize: data.containerSize || null,
        sealNumber: data.sealNumber || null,
        unitsInside: num(data.unitsInside),
        siEcSentToForwarder: data.siEcSentToForwarder ?? false,
        shippingOrderReceived: data.shippingOrderReceived ?? false,
        freightVendorId: emptyToNull(data.freightVendorId),
        blCopyUploaded: data.blCopyUploaded ?? false,
        blDetailsConfirmed: data.blDetailsConfirmed ?? false,
        blPaid: data.blPaid ?? false,
        lcCopyUploaded: data.lcCopyUploaded ?? false,
        exportDeclarationUploaded: data.exportDeclarationUploaded ?? false,
        recycleApplied: data.recycleApplied ?? false,
        blReleased: data.blReleased ?? false,
        dhlTracking: data.dhlTracking || null,
      };
    },
    [currentStage]
  );

  // Helper function to safely parse dates
  const safeDateToString = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    try {
      let dateObj: Date;
      if (typeof date === "string") {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        // Handle case where date might be an object - try to convert to string first
        dateObj = new Date(String(date));
      }
      // Check if dateObj is valid and has getTime method
      if (
        !dateObj ||
        typeof dateObj.getTime !== "function" ||
        isNaN(dateObj.getTime())
      ) {
        return "";
      }
      return dateObj.toISOString().split("T")[0];
    } catch (error) {
      // Silently return empty string - don't log errors for invalid dates
      return "";
    }
  };

  useEffect(() => {
    return () => {
      if (saveFeedbackTimeoutRef.current) {
        clearTimeout(saveFeedbackTimeoutRef.current);
      }
    };
  }, []);

  // Sync formData from server only once when we first load this vehicle. Never overwrite on refetch:
  // - After "Add fee" (charge dialog) the server wasn't updated with the checkbox, so refetch would overwrite and the checkbox would disappear.
  // - After Save we already have the right formData locally; no need to overwrite.
  // - Same for document upload and any other onUpdate() call. Only the initial load should populate the form.
  useEffect(() => {
    if (!stageData) return;
    const vehicleChanged = lastVehicleIdRef.current !== vehicleId;
    if (vehicleChanged) {
      lastVehicleIdRef.current = vehicleId;
      hasSyncedForVehicleRef.current = false;
    }
    if (hasSyncedForVehicleRef.current) return;
    hasSyncedForVehicleRef.current = true;
    const initialData = {
      purchaseVendorId: stageData.purchaseVendorId || "",
      purchasePaid: stageData.purchasePaid || false,
      purchasePaymentDeadline: safeDateToString(
        stageData.purchasePaymentDeadline,
      ),
      purchasePaymentDate: safeDateToString(stageData.purchasePaymentDate),
      yardId: stageData.yardId || "",
      transportArranged: stageData.transportArranged,
      yardNotified: stageData.yardNotified,
      photosRequested: stageData.photosRequested,
      transportVendorId: stageData.transportVendorId || "",
      repairSkipped: stageData.repairSkipped ?? false,
      repairVendorId: stageData.repairVendorId || "",
      numberPlatesReceived: stageData.numberPlatesReceived ?? false,
      deregistrationComplete: stageData.deregistrationComplete ?? false,
      exportCertificateUploaded: stageData.exportCertificateUploaded,
      deregistrationSentToAuction:
        stageData.deregistrationSentToAuction ?? false,
      insuranceRefundClaimed: stageData.insuranceRefundClaimed ?? false,
      spareKeysReceived: stageData.spareKeysReceived,
      maintenanceRecordsReceived: stageData.maintenanceRecordsReceived,
      manualsReceived: stageData.manualsReceived,
      cataloguesReceived: stageData.cataloguesReceived,
      accessoriesReceived: stageData.accessoriesReceived,
      otherItemsReceived: stageData.otherItemsReceived,
      bookingType: stageData.bookingType || "",
      bookingRequested: stageData.bookingRequested,
      bookingStatus: stageData.bookingStatus || "",
      bookingNumber: stageData.bookingNumber || "",
      pod: stageData.pod || "",
      pol: stageData.pol || "",
      vesselName: stageData.vesselName || "",
      voyageNo: stageData.voyageNo || "",
      etd: safeDateToString(stageData.etd),
      eta: safeDateToString(stageData.eta),
      notes: stageData.notes || "",
      containerNumber: stageData.containerNumber || "",
      containerSize: stageData.containerSize || "",
      sealNumber: stageData.sealNumber || "",
      unitsInside: stageData.unitsInside?.toString() || "",
      siEcSentToForwarder: stageData.siEcSentToForwarder,
      shippingOrderReceived: stageData.shippingOrderReceived,
      freightVendorId: stageData.freightVendorId || "",
      blCopyUploaded: stageData.blCopyUploaded,
      blDetailsConfirmed: stageData.blDetailsConfirmed,
      blPaid: stageData.blPaid,
      lcCopyUploaded: stageData.lcCopyUploaded,
      exportDeclarationUploaded: stageData.exportDeclarationUploaded,
      recycleApplied: stageData.recycleApplied,
      blReleased: stageData.blReleased,
      dhlTracking: stageData.dhlTracking || "",
    };
    setFormData(initialData);
    previousFormDataRef.current = initialData;
    isInitialMount.current = true;
  }, [vehicleId, currentStage, stageData]);

  const handleSave = useCallback(async () => {
    if (saveFeedbackTimeoutRef.current) {
      clearTimeout(saveFeedbackTimeoutRef.current);
      saveFeedbackTimeoutRef.current = null;
    }
    setSaveError(null);
    setSaveStatus("saving");
    setSaving(true);
    try {
      const payload = buildStagePayload(formData);
      const response = await fetch(`/api/vehicles/${vehicleId}/stages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSaveStatus("saved");
        saveFeedbackTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        const err = await response.json().catch(() => ({ error: "Save failed" }));
        const message = err?.error ?? "Save failed";
        setSaveError(message);
        setSaveStatus("error");
        console.error("Error saving:", message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      setSaveError(message);
      setSaveStatus("error");
      console.error("Error saving stage data:", error);
    } finally {
      setSaving(false);
    }
  }, [vehicleId, formData, onUpdate, buildStagePayload]);

  // Persist stage form data to the server (used after document upload / add fee so server stays in sync)
  const saveWithData = useCallback(
    async (data: Partial<VehicleStageFormData>) => {
      try {
        setSaving(true);
        const merged = { ...formData, ...data };
        const payload = buildStagePayload(merged);
        const response = await fetch(`/api/vehicles/${vehicleId}/stages`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return response.ok;
      } catch (error) {
        console.error("Error saving stage data:", error);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [vehicleId, formData, buildStagePayload]
  );

  // Auto-save with debouncing
  useEffect(() => {
    // Skip auto-save on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousFormDataRef.current = { ...formData };
      return;
    }

    // Check if formData actually changed
    const formDataString = JSON.stringify(formData);
    const previousFormDataString = JSON.stringify(previousFormDataRef.current);

    if (formDataString === previousFormDataString) {
      return; // No changes, skip save
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (1 second after last change)
    saveTimeoutRef.current = setTimeout(() => {
      previousFormDataRef.current = { ...formData };
      handleSave();
    }, 1000);

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, handleSave]);

  const openAddVendor = useCallback(
    (field: AddVendorForField, initialCategory: VendorCategory) => {
      setAddVendorForField(field);
      setAddVendorInitialCategory(initialCategory);
      setAddVendorOpen(true);
    },
    [],
  );

  const handleAddVendorClose = useCallback(
    async (createdVendorId?: string) => {
      setAddVendorOpen(false);
      if (!createdVendorId || !addVendorForField) return;
      await Promise.all([
        onRefetchVendors?.(),
        addVendorForField === "yardId" ? onRefetchYards?.() : undefined,
      ]);
      if (addVendorForField === "yardId") {
        setFormData((prev) => ({
          ...prev,
          yardId: `vendor-${createdVendorId}`,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [addVendorForField]: createdVendorId,
        }));
      }
      setAddVendorForField(null);
    },
    [addVendorForField, onRefetchVendors, onRefetchYards],
  );

  const renderPurchaseStage = () => {
    // Filter vendors for purchase stage - show both auction houses and dealerships
    const purchaseVendors = vendors.filter(
      (v) => v.category === "AUCTION_HOUSE" || v.category === "DEALERSHIP",
    );

    return (
      <div className="space-y-4">
        <div>
          <Label>Purchase Vendor (Auction/Purchase Fees)</Label>
          <Select
            value={formData.purchaseVendorId ?? ""}
            onValueChange={(value) => {
              if (value === "__add_vendor_purchase__") {
                openAddVendor("purchaseVendorId", VendorCategory.AUCTION_HOUSE);
                return;
              }
              setFormData((prev) => ({ ...prev, purchaseVendorId: value }));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select vendor" />
            </SelectTrigger>
            <SelectContent>
              {purchaseVendors.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </SelectItem>
              ))}
              <SelectItem value="__add_vendor_purchase__">
                <span className="text-primary font-medium">+ Add Vendor</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const renderTransportStage = () => (
    <div className="space-y-4">
      <div>
        <Label>Storage Yard</Label>
        <Select
          value={formData.yardId ?? ""}
          onValueChange={(value) => {
            if (value === "__add_vendor_yard__") {
              openAddVendor("yardId", VendorCategory.YARD);
              return;
            }
            setFormData((prev) => ({ ...prev, yardId: value }));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select yard" />
          </SelectTrigger>
          <SelectContent>
            {yards && yards.length > 0 ? (
              yards.map((yard) => (
                <SelectItem key={yard.id} value={yard.id}>
                  {yard.name}
                </SelectItem>
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No yards available
              </div>
            )}
            <SelectItem value="__add_vendor_yard__">
              <span className="text-primary font-medium">+ Add Vendor</span>
            </SelectItem>
          </SelectContent>
        </Select>
        {yards && yards.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            No storage yards found. Please add yards in the admin section.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="transportArranged"
            checked={!!formData.transportArranged}
            onCheckedChange={(checked) => {
              if (checked) {
                setPendingChargeType("Inland Transport");
                setChargeDialogOpen(true);
              } else {
                setFormData((prev) => ({ ...prev, transportArranged: false }));
              }
            }}
          />
          <Label htmlFor="transportArranged">Transport Arranged</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="yardNotified"
            checked={!!formData.yardNotified}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, yardNotified: !!checked }))
            }
          />
          <Label htmlFor="yardNotified">Yard Notified</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="photosRequested"
            checked={!!formData.photosRequested}
            onCheckedChange={(checked) => {
              if (checked) {
                // Get the yard's vendor
                const selectedYard = yards.find(
                  (y) => y.id === formData.yardId,
                );
                if (!selectedYard || !selectedYard.vendor?.id) {
                  alert(
                    "Please select a yard first. The yard must have an associated vendor.",
                  );
                  return;
                }
                setPendingChargeType("Photo Inspection");
                setPendingVendorId(selectedYard.vendor.id);
                setChargeDialogOpen(true);
              } else {
                setFormData((prev) => ({ ...prev, photosRequested: false }));
              }
            }}
          />
          <Label htmlFor="photosRequested">Photos Requested (from Yard)</Label>
        </div>
      </div>

      {(formData.transportArranged || formData.photosRequested) && (
        <div className="border-t pt-4 space-y-3">
          {formData.transportArranged && (
            <div>
              <Label>Transport Company</Label>
              <Select
                value={formData.transportVendorId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, transportVendorId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select transport company" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {formData.photosRequested && (
            <p className="text-sm text-muted-foreground">
              Photos are requested from the selected yard above.
            </p>
          )}
          <VehicleCostsManager
            vehicleId={vehicleId}
            currentStage={ShippingStage.TRANSPORT}
            refreshTrigger={stageCostsRefreshTrigger}
          />
        </div>
      )}
    </div>
  );

  const handleSkipRepair = async () => {
    if (!confirm("Are you sure you want to skip the repair stage?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/vehicles/${vehicleId}/stages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: currentStage,
          repairSkipped: true,
        }),
      });
      if (response.ok) {
        setFormData((prev) => ({ ...prev, repairSkipped: true }));
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error skipping repair stage:", error);
      alert("Failed to update repair stage");
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreRepair = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vehicles/${vehicleId}/stages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: currentStage,
          repairSkipped: false,
        }),
      });
      if (response.ok) {
        setFormData((prev) => ({ ...prev, repairSkipped: false }));
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error restoring repair stage:", error);
      alert("Failed to restore repair stage");
    } finally {
      setLoading(false);
    }
  };

  const renderRepairStage = () => (
    <div className="space-y-4">
      {formData.repairSkipped ? (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2C] rounded-lg border">
          <div>
            <p className="font-medium">Repair/Storage Stage</p>
            <p className="text-sm text-gray-500 dark:text-[#A1A1A1]">
              This stage was skipped. Restore it to add a repair/storage vendor.
            </p>
          </div>
          <Button
            onClick={handleRestoreRepair}
            disabled={loading}
            variant="outline"
          >
            Restore repair stage
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2C] rounded-lg border">
            <div>
              <p className="font-medium">Repair/Storage Stage</p>
              <p className="text-sm text-gray-500 dark:text-[#A1A1A1]">
                Skip this stage if no repair or storage is needed
              </p>
            </div>
            <Button
              onClick={handleSkipRepair}
              disabled={loading}
              variant="outline"
            >
              Skip Repair Stage
            </Button>
          </div>

          <div>
            <Label>Repair/Storage Vendor</Label>
            <Select
              value={formData.repairVendorId ?? ""}
              onValueChange={(value) => {
                if (value === "__add_vendor_repair__") {
                  openAddVendor("repairVendorId", VendorCategory.GARAGE);
                  return;
                }
                setFormData((prev) => ({ ...prev, repairVendorId: value }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select repair vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
                <SelectItem value="__add_vendor_repair__">
                  <span className="text-primary font-medium">+ Add Vendor</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );

  const renderDocumentsStage = () => {
    // If registration status is unknown, show selection first
    if (isRegistered === null) {
      return (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">
                info
              </span>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                  Vehicle Registration Status
                </h3>
                <p className="text-sm text-gray-600 dark:text-[#A1A1A1] mb-4">
                  Please select whether this vehicle is registered or not
                  registered to proceed with the appropriate documentation
                  process.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={async () => {
                      // Update vehicle registration status
                      try {
                        const response = await fetch(
                          `/api/vehicles/${vehicleId}`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ isRegistered: true }),
                          },
                        );
                        if (response.ok) {
                          onVehiclePatch?.({ isRegistered: true }) ?? onUpdate();
                        }
                      } catch (error) {
                        console.error(
                          "Error updating registration status:",
                          error,
                        );
                        alert("Failed to update registration status");
                      }
                    }}
                    className="flex-1"
                  >
                    <span className="material-symbols-outlined text-lg mr-2">
                      check_circle
                    </span>
                    Registered Vehicle
                  </Button>
                  <Button
                    onClick={async () => {
                      // Update vehicle registration status
                      try {
                        const response = await fetch(
                          `/api/vehicles/${vehicleId}`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ isRegistered: false }),
                          },
                        );
                        if (response.ok) {
                          onVehiclePatch?.({ isRegistered: false }) ?? onUpdate();
                        }
                      } catch (error) {
                        console.error(
                          "Error updating registration status:",
                          error,
                        );
                        alert("Failed to update registration status");
                      }
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <span className="material-symbols-outlined text-lg mr-2">
                      cancel
                    </span>
                    Not Registered
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show registered vehicle process
    if (isRegistered === true) {
      return (
        <div className="space-y-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                  check_circle
                </span>
                <span className="font-medium text-green-900 dark:text-green-200">
                  Registered Vehicle Process
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/vehicles/${vehicleId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ isRegistered: null }),
                    });
                    if (response.ok) {
                      onVehiclePatch?.({ isRegistered: null }) ?? onUpdate();
                    }
                  } catch (error) {
                    console.error("Error updating registration status:", error);
                    alert("Failed to update registration status");
                  }
                }}
              >
                <span className="material-symbols-outlined text-sm mr-1">
                  edit
                </span>
                Change
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-[#2C2C2C] rounded-lg border border-gray-200 dark:border-[#2C2C2C]">
                <Checkbox
                  id="numberPlatesReceived"
                  checked={formData.numberPlatesReceived ?? false}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      numberPlatesReceived: !!checked,
                    })
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="numberPlatesReceived"
                    className="font-medium cursor-pointer"
                  >
                    Number Plates Received from Auction
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-[#A1A1A1] mt-1">
                    Confirm that the number plates have been received from the
                    auction house
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-[#2C2C2C] rounded-lg border border-gray-200 dark:border-[#2C2C2C]">
                <Checkbox
                  id="deregistrationComplete"
                  checked={formData.deregistrationComplete ?? false}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      deregistrationComplete: !!checked,
                    }))
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="deregistrationComplete"
                    className="font-medium cursor-pointer"
                  >
                    Deregistration Process Complete
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-[#A1A1A1] mt-1">
                    Complete the deregistration process for the vehicle
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800">
                <Checkbox
                  id="exportCertificateUploaded"
                  checked={!!formData.exportCertificateUploaded}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setPendingDocumentField("exportCertificate");
                      setPendingDocumentCategory(
                        DocumentCategory.EXPORT_CERTIFICATE,
                      );
                      setDocumentUploadDialogOpen(true);
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        exportCertificateUploaded: false,
                      }));
                    }
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="exportCertificateUploaded"
                    className="font-medium cursor-pointer"
                  >
                    Export Certificate Uploaded{" "}
                    <span className="text-red-600 dark:text-red-400 font-semibold">
                      *
                    </span>
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-[#A1A1A1] mt-1">
                    Upload the export certificate in the Document Library. This
                    step is mandatory and cannot be skipped.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-[#2C2C2C] rounded-lg border border-gray-200 dark:border-[#2C2C2C]">
                <Checkbox
                  id="deregistrationSentToAuction"
                  checked={formData.deregistrationSentToAuction ?? false}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      deregistrationSentToAuction: !!checked,
                    }))
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="deregistrationSentToAuction"
                    className="font-medium cursor-pointer"
                  >
                    Deregistration Certificate Sent to Auction House
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-[#A1A1A1] mt-1">
                    Send a copy of the deregistration certificate to the auction
                    house
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-[#2C2C2C] rounded-lg border border-gray-200 dark:border-[#2C2C2C]">
                <Checkbox
                  id="insuranceRefundClaimed"
                  checked={formData.insuranceRefundClaimed ?? false}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      insuranceRefundClaimed: !!checked,
                    }))
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="insuranceRefundClaimed"
                    className="font-medium cursor-pointer"
                  >
                    Insurance Refund Claimed
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-[#A1A1A1] mt-1">
                    Claim the insurance refund for the deregistered vehicle
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Accessories Section - Common for both registered and unregistered */}
          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold text-lg mb-4">Accessories Received</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="spareKeysReceived"
                  checked={!!formData.spareKeysReceived}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      spareKeysReceived: !!checked,
                    }))
                  }
                />
                <Label htmlFor="spareKeysReceived">Spare Keys</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="maintenanceRecordsReceived"
                  checked={!!formData.maintenanceRecordsReceived}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      maintenanceRecordsReceived: !!checked,
                    }))
                  }
                />
                <Label htmlFor="maintenanceRecordsReceived">
                  Maintenance Records
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="manualsReceived"
                  checked={!!formData.manualsReceived}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      manualsReceived: !!checked,
                    }))
                  }
                />
                <Label htmlFor="manualsReceived">Manuals</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cataloguesReceived"
                  checked={!!formData.cataloguesReceived}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      cataloguesReceived: !!checked,
                    }))
                  }
                />
                <Label htmlFor="cataloguesReceived">Catalogues</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="accessoriesReceived"
                  checked={!!formData.accessoriesReceived}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      accessoriesReceived: !!checked,
                    })
                  }
                />
                <Label htmlFor="accessoriesReceived">Accessories</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="otherItemsReceived"
                  checked={!!formData.otherItemsReceived}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      otherItemsReceived: !!checked,
                    }))
                  }
                />
                <Label htmlFor="otherItemsReceived">Other Items</Label>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show unregistered vehicle process
    return (
      <div className="space-y-6">
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">
                cancel
              </span>
              <span className="font-medium text-orange-900 dark:text-orange-200">
                Unregistered Vehicle Process
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const response = await fetch(`/api/vehicles/${vehicleId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ isRegistered: null }),
                  });
                  if (response.ok) {
                    onVehiclePatch?.({ isRegistered: null }) ?? onUpdate();
                  }
                } catch (error) {
                  console.error("Error updating registration status:", error);
                  alert("Failed to update registration status");
                }
              }}
            >
              <span className="material-symbols-outlined text-sm mr-1">
                edit
              </span>
              Change
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800">
            <Checkbox
              id="exportCertificateUploadedUnreg"
              checked={formData.exportCertificateUploaded}
              onCheckedChange={(checked) => {
                if (checked) {
                  setPendingDocumentField("exportCertificate");
                  setPendingDocumentCategory(
                    DocumentCategory.EXPORT_CERTIFICATE,
                  );
                  setDocumentUploadDialogOpen(true);
                } else {
                  setFormData({
                    ...formData,
                    exportCertificateUploaded: false,
                  });
                }
              }}
              className="mt-1"
            />
            <div className="flex-1">
              <Label
                htmlFor="exportCertificateUploadedUnreg"
                className="font-medium cursor-pointer"
              >
                Export Certificate Created & Uploaded{" "}
                <span className="text-red-600 dark:text-red-400 font-semibold">
                  *
                </span>
              </Label>
              <p className="text-sm text-gray-600 dark:text-[#A1A1A1] mt-1">
                Create and upload the export certificate for the unregistered
                vehicle in the Document Library. This step is mandatory and
                cannot be skipped.
              </p>
            </div>
          </div>
        </div>

        {/* Accessories Section - Common for both registered and unregistered */}
        <div className="border-t pt-6 mt-6">
          <h3 className="font-semibold text-lg mb-4">Accessories Received</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="spareKeysReceivedUnreg"
                checked={formData.spareKeysReceived}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    spareKeysReceived: !!checked,
                  }))
                }
              />
              <Label htmlFor="spareKeysReceivedUnreg">Spare Keys</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="maintenanceRecordsReceivedUnreg"
                checked={formData.maintenanceRecordsReceived}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    maintenanceRecordsReceived: !!checked,
                  }))
                }
              />
              <Label htmlFor="maintenanceRecordsReceivedUnreg">
                Maintenance Records
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="manualsReceivedUnreg"
                checked={formData.manualsReceived}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    manualsReceived: !!checked,
                  }))
                }
              />
              <Label htmlFor="manualsReceivedUnreg">Manuals</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="cataloguesReceivedUnreg"
                checked={formData.cataloguesReceived}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    cataloguesReceived: !!checked,
                  })
                }
              />
              <Label htmlFor="cataloguesReceivedUnreg">Catalogues</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="accessoriesReceivedUnreg"
                checked={formData.accessoriesReceived}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    accessoriesReceived: !!checked,
                  }))
                }
              />
              <Label htmlFor="accessoriesReceivedUnreg">Accessories</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="otherItemsReceivedUnreg"
                checked={formData.otherItemsReceived}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    otherItemsReceived: !!checked,
                  }))
                }
              />
              <Label htmlFor="otherItemsReceivedUnreg">Other Items</Label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBookingStage = () => (
    <div className="space-y-4">
      <div>
        <Label>Booking Type</Label>
        <Select
          value={formData.bookingType}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, bookingType: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select booking type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RORO">RoRo</SelectItem>
            <SelectItem value="CONTAINER">Container</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Shipping Agent</Label>
        <Select
          value={formData.freightVendorId ?? ""}
          onValueChange={(value) => {
            if (value === "__add_vendor_freight__") {
              openAddVendor("freightVendorId", VendorCategory.SHIPPING_AGENT);
              return;
            }
            setFormData((prev) => ({ ...prev, freightVendorId: value }));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select shipping agent" />
          </SelectTrigger>
          <SelectContent>
            {vendors
              .filter(
                (v) =>
                  v.category === "SHIPPING_AGENT" ||
                  v.category === "FREIGHT_VENDOR",
              )
              .map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </SelectItem>
              ))}
            <SelectItem value="__add_vendor_freight__">
              <span className="text-primary font-medium">+ Add Vendor</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="bookingRequested"
          checked={!!formData.bookingRequested}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({
              ...prev,
              bookingRequested: !!checked,
            }))
          }
        />
        <Label htmlFor="bookingRequested">Booking Requested</Label>
      </div>

      <div>
        <Label>Booking Status</Label>
        <Select
          value={formData.bookingStatus}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, bookingStatus: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Booking Number</Label>
          <Input
            value={formData.bookingNumber}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                bookingNumber: e.target.value,
              }))
            }
          />
        </div>
        <div>
          <Label>Voyage No.</Label>
          <Input
            value={formData.voyageNo}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, voyageNo: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Port of Loading (POL)</Label>
          <Input
            value={formData.pol}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, pol: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>Port of Destination (POD)</Label>
          <Input
            value={formData.pod}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, pod: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Vessel Name</Label>
          <Input
            value={formData.vesselName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, vesselName: e.target.value }))
            }
          />
        </div>
        <div>
          <Label>ETD</Label>
          <DatePicker
            value={formData.etd}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, etd: e.target.value }))
            }
          />
        </div>
      </div>

      <div>
        <Label>ETA</Label>
        <DatePicker
          value={formData.eta}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, eta: e.target.value }))
          }
        />
      </div>

      {formData.bookingType === "CONTAINER" && (
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold">Container Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Container Number</Label>
              <Input
                value={formData.containerNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    containerNumber: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Container Size</Label>
              <Input
                value={formData.containerSize}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    containerSize: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Seal Number</Label>
              <Input
                value={formData.sealNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sealNumber: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Units Inside</Label>
              <Input
                type="number"
                value={formData.unitsInside}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    unitsInside: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 border-t pt-4">
        <h3 className="font-semibold">Documentation Tasks</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="siEcSentToForwarder"
              checked={!!formData.siEcSentToForwarder}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  siEcSentToForwarder: !!checked,
                }))
              }
            />
            <Label htmlFor="siEcSentToForwarder">
              SI & EC Sent to Forwarder
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="shippingOrderReceived"
              checked={!!formData.shippingOrderReceived}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  shippingOrderReceived: !!checked,
                })
              }
            />
            <Label htmlFor="shippingOrderReceived">
              Shipping Order (SO) Received
            </Label>
          </div>
        </div>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          rows={3}
        />
      </div>
    </div>
  );

  const renderShippedStage = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="blCopyUploaded"
            checked={!!formData.blCopyUploaded}
            onCheckedChange={(checked) => {
              if (checked) {
                setPendingDocumentField("blCopy");
                setPendingDocumentCategory(DocumentCategory.BILL_OF_LADING);
                setDocumentUploadDialogOpen(true);
              } else {
                setFormData((prev) => ({ ...prev, blCopyUploaded: false }));
              }
            }}
          />
          <Label htmlFor="blCopyUploaded">BL Copy Uploaded</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="blDetailsConfirmed"
            checked={!!formData.blDetailsConfirmed}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({
                ...prev,
                blDetailsConfirmed: !!checked,
              }))
            }
          />
          <Label htmlFor="blDetailsConfirmed">
            BL Details Confirmed by Customer
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="blPaid"
            checked={!!formData.blPaid}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, blPaid: !!checked }))
            }
          />
          <Label htmlFor="blPaid">B/L Paid</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="lcCopyUploaded"
            checked={!!formData.lcCopyUploaded}
            onCheckedChange={(checked) => {
              if (checked) {
                setPendingDocumentField("lcCopy");
                setPendingDocumentCategory(DocumentCategory.LETTER_OF_CREDIT);
                setDocumentUploadDialogOpen(true);
              } else {
                setFormData((prev) => ({ ...prev, lcCopyUploaded: false }));
              }
            }}
          />
          <Label htmlFor="lcCopyUploaded">LC Copy Uploaded (Sri Lanka)</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="exportDeclarationUploaded"
            checked={!!formData.exportDeclarationUploaded}
            onCheckedChange={(checked) => {
              if (checked) {
                setPendingDocumentField("exportDeclaration");
                setPendingDocumentCategory(DocumentCategory.EXPORT_DECLARATION);
                setDocumentUploadDialogOpen(true);
              } else {
                setFormData({
                  ...formData,
                  exportDeclarationUploaded: false,
                });
              }
            }}
          />
          <Label htmlFor="exportDeclarationUploaded">
            Export Declaration Uploaded
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="recycleApplied"
            checked={!!formData.recycleApplied}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, recycleApplied: !!checked }))
            }
          />
          <Label htmlFor="recycleApplied">Recycle Applied</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="blReleased"
            checked={!!formData.blReleased}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, blReleased: !!checked }))
            }
          />
          <Label htmlFor="blReleased">BL Released</Label>
        </div>
      </div>
    </div>
  );

  const renderDHLStage = () => (
    <div className="space-y-4">
      <div>
        <Label>DHL Tracking Number</Label>
        <Input
          value={formData.dhlTracking}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, dhlTracking: e.target.value }))
          }
          placeholder="Enter DHL tracking number"
        />
      </div>
    </div>
  );

  const renderStageForm = () => {
    switch (currentStage) {
      case ShippingStage.PURCHASE:
        return renderPurchaseStage();
      case ShippingStage.TRANSPORT:
        return renderTransportStage();
      case ShippingStage.REPAIR:
        return renderRepairStage();
      case ShippingStage.DOCUMENTS:
        return renderDocumentsStage();
      case ShippingStage.BOOKING:
        return renderBookingStage();
      case ShippingStage.SHIPPED:
        return renderShippedStage();
      case ShippingStage.DHL:
        return renderDHLStage();
      default:
        return <div>No form for this stage</div>;
    }
  };

  const [pendingDocumentField, setPendingDocumentField] = useState<
    string | null
  >(null);

  const handleDocumentUploadSuccess = async () => {
    let nextData: Partial<VehicleStageFormData> | null = null;
    if (pendingDocumentField === "exportCertificate") {
      nextData = { ...formData, exportCertificateUploaded: true };
    } else if (pendingDocumentField === "blCopy") {
      nextData = { ...formData, blCopyUploaded: true };
    } else if (pendingDocumentField === "exportDeclaration") {
      nextData = { ...formData, exportDeclarationUploaded: true };
    } else if (pendingDocumentField === "lcCopy") {
      nextData = { ...formData, lcCopyUploaded: true };
    }
    setPendingDocumentField(null);
    setPendingDocumentCategory(null);
    if (nextData) {
      setFormData(nextData);
      await saveWithData(nextData);
    }
    onDocumentUploaded?.();
  };

  const handleChargeSuccess = async () => {
    let nextData: Partial<VehicleStageFormData> | null = null;
    if (pendingChargeType === "Inland Transport") {
      nextData = { ...formData, transportArranged: true };
    } else if (pendingChargeType === "Photo Inspection") {
      nextData = { ...formData, photosRequested: true };
    }
    setPendingChargeType("");
    setPendingVendorId(null);
    if (nextData) {
      setFormData(nextData);
      await saveWithData(nextData);
      setStageCostsRefreshTrigger((t) => t + 1);
    }
  };

  const handleDocumentDialogClose = (open: boolean) => {
    if (!open && pendingDocumentCategory) {
      // User cancelled, uncheck the checkbox
      if (pendingDocumentField === "exportCertificate") {
        setFormData((prev) => ({
          ...prev,
          exportCertificateUploaded: false,
        }));
      } else if (pendingDocumentField === "blCopy") {
        setFormData((prev) => ({
          ...prev,
          blCopyUploaded: false,
        }));
      } else if (pendingDocumentField === "exportDeclaration") {
        setFormData((prev) => ({
          ...prev,
          exportDeclarationUploaded: false,
        }));
      } else if (pendingDocumentField === "lcCopy") {
        setFormData((prev) => ({
          ...prev,
          lcCopyUploaded: false,
        }));
      }
      setPendingDocumentCategory(null);
      setPendingDocumentField(null);
    }
    setDocumentUploadDialogOpen(open);
  };

  const handleChargeDialogClose = (open: boolean) => {
    if (!open && pendingChargeType) {
      // User cancelled, uncheck the checkbox
      if (pendingChargeType === "Inland Transport") {
        setFormData((prev) => ({
          ...prev,
          transportArranged: false,
        }));
      } else if (pendingChargeType === "Photo Inspection") {
        setFormData((prev) => ({
          ...prev,
          photosRequested: false,
        }));
      }
      setPendingChargeType("");
      setPendingVendorId(null);
    }
    setChargeDialogOpen(open);
  };

  return (
    <div className="space-y-4">
      {renderStageForm()}
      <div className="flex items-center justify-end gap-3 pt-2 border-t flex-wrap">
        {saveStatus === "saved" && (
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Saved
          </span>
        )}
        {saveStatus === "error" && saveError && (
          <span className="text-xs text-destructive flex items-center gap-1" title={saveError}>
            <span className="material-symbols-outlined text-sm">error</span>
            {saveError}
          </span>
        )}
        {saveStatus === "saving" && (
          <span className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-sm animate-spin">sync</span>
            Saving...
          </span>
        )}
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={saving}
          onClick={() => handleSave()}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Document Upload Dialog */}
      {pendingDocumentCategory && (
        <QuickDocumentUploadDialog
          open={documentUploadDialogOpen}
          onOpenChange={handleDocumentDialogClose}
          vehicleId={vehicleId}
          category={pendingDocumentCategory}
          stage={currentStage}
          documentName={
            pendingDocumentCategory === DocumentCategory.EXPORT_CERTIFICATE
              ? "Export Certificate"
              : pendingDocumentCategory === DocumentCategory.BILL_OF_LADING
                ? "Bill of Lading"
                : pendingDocumentCategory ===
                    DocumentCategory.EXPORT_DECLARATION
                  ? "Export Declaration"
                  : pendingDocumentCategory ===
                      DocumentCategory.LETTER_OF_CREDIT
                    ? "Letter of Credit"
                    : "Document"
          }
          onSuccess={handleDocumentUploadSuccess}
        />
      )}

      {/* Charge Dialog */}
      {pendingChargeType && (
        <QuickChargeDialog
          open={chargeDialogOpen}
          onOpenChange={handleChargeDialogClose}
          vehicleId={vehicleId}
          stage={currentStage}
          chargeType={pendingChargeType}
          vendors={vendors}
          preselectedVendorId={pendingVendorId}
          onSuccess={handleChargeSuccess}
        />
      )}

      {/* Add Vendor modal (from stage dropdowns) */}
      {addVendorOpen && (
        <VendorForm
          onClose={handleAddVendorClose}
          initialCategory={addVendorInitialCategory}
        />
      )}
    </div>
  );
}
