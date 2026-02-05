"use client";

import { useState, useEffect } from "react";
import { ShippingStage, DocumentCategory } from "@prisma/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";

interface Document {
  id: string;
  stage: ShippingStage | null;
  category: DocumentCategory;
  name: string;
  fileUrl: string;
  fileType: string | null;
  fileSize: number | null;
  description: string | null;
  visibleToCustomer: boolean;
  createdAt: string;
}

interface VehicleDocumentsManagerProps {
  vehicleId: string;
  currentStage: ShippingStage | null;
}

const documentCategories: Record<DocumentCategory, string> = {
  AUCTION_DETAILS: "Auction Details",
  FINAL_BID: "Final Bid",
  INVOICE: "Invoice",
  PHOTOS: "Photos",
  ETD_ETA: "ETD/ETA",
  EXPORT_CERTIFICATE: "Export Certificate",
  DEREGISTRATION_CERTIFICATE: "Deregistration Certificate",
  INSURANCE_REFUND: "Insurance Refund",
  SHIPPING_INSTRUCTIONS: "Shipping Instructions (SI)",
  SHIPPING_ORDER: "Shipping Order (SO)",
  BILL_OF_LADING: "Bill of Lading (BL)",
  LETTER_OF_CREDIT: "Letter of Credit (LC)",
  EXPORT_DECLARATION: "Export Declaration",
  RECYCLE_APPLICATION: "Recycle Application",
  DHL_TRACKING: "DHL Tracking",
  SPARE_KEYS: "Spare Keys",
  MAINTENANCE_RECORDS: "Maintenance Records",
  MANUALS: "Manuals",
  CATALOGUES: "Catalogues",
  ACCESSORIES: "Accessories",
  RELEASED_BILL_OF_LADING: "Released Bill of Lading (B/L)",
  AUCTION_SHEET: "Auction Sheet",
  OTHER: "Other",
};

// Categories to hide from the upload dropdown
const hiddenCategories: DocumentCategory[] = [
  DocumentCategory.MAINTENANCE_RECORDS,
  DocumentCategory.SPARE_KEYS,
  DocumentCategory.CATALOGUES,
  DocumentCategory.ACCESSORIES,
  DocumentCategory.MANUALS,
  DocumentCategory.FINAL_BID,
  DocumentCategory.AUCTION_DETAILS,
];

const stageLabels: Record<ShippingStage | "GENERAL", string> = {
  PURCHASE: "Purchase",
  TRANSPORT: "Transport",
  REPAIR: "Repair",
  DOCUMENTS: "Documents",
  BOOKING: "Booking",
  SHIPPED: "Shipped",
  DHL: "DHL",
  GENERAL: "General",
};

export function VehicleDocumentsManager({
  vehicleId,
  currentStage,
}: VehicleDocumentsManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [formData, setFormData] = useState({
    stage: currentStage || "",
    category: "" as DocumentCategory | "",
    name: "",
    fileUrl: "",
    description: "",
    visibleToCustomer: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [vehicleId]);

  const fetchDocuments = async () => {
    try {
      // Fetch ALL documents (no stage filter)
      const response = await fetch(`/api/vehicles/${vehicleId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        setError("File size must be less than 10MB");
        return;
      }
      setFile(selectedFile);

      // Set name immediately
      setFormData((prev) => ({ ...prev, name: selectedFile.name }));

      // Upload file to server
      try {
        setUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedFile);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          setFormData((prev) => ({
            ...prev,
            name: selectedFile.name,
            fileUrl: uploadData.url,
          }));
        } else {
          const errorData = await uploadResponse.json().catch(() => ({}));
          setError(
            errorData.error || "Failed to upload file. Please try again.",
          );
          setFile(null);
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        setError("Failed to upload file. Please try again.");
        setFile(null);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleOpenDialog = (doc?: Document) => {
    setError(null);
    if (doc) {
      setEditingDocument(doc);
      setFormData({
        stage: doc.stage || "",
        category: doc.category,
        name: doc.name,
        fileUrl: doc.fileUrl,
        description: doc.description || "",
        visibleToCustomer: doc.visibleToCustomer,
      });
    } else {
      setEditingDocument(null);
      setFormData({
        stage: currentStage || "",
        category: "" as DocumentCategory | "",
        name: "",
        fileUrl: "",
        description: "",
        visibleToCustomer: false,
      });
    }
    setFile(null);
    setDialogOpen(true);
  };

  const handleSaveDocument = async () => {
    setError(null);

    // Validate required fields
    if (!formData.name || !formData.category) {
      setError("Please fill in document name and category");
      return;
    }

    // Final validation - must have file uploaded
    if (!formData.fileUrl) {
      setError("Please upload a file");
      return;
    }

    try {
      setSaving(true);
      if (editingDocument) {
        // Update existing document
        const response = await fetch(
          `/api/vehicles/${vehicleId}/documents/${editingDocument.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...formData,
              fileUrl: formData.fileUrl,
              stage: formData.stage || null,
            }),
          },
        );
        if (response.ok) {
          fetchDocuments();
          setDialogOpen(false);
          setFile(null);
          setError(null);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to update document");
        }
      } else {
        // Create new document
        const response = await fetch(`/api/vehicles/${vehicleId}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            fileUrl: formData.fileUrl,
            stage: formData.stage || null,
            fileType: file?.type || null,
            fileSize: file?.size || null,
          }),
        });
        if (response.ok) {
          fetchDocuments();
          setDialogOpen(false);
          setFile(null);
          setError(null);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to create document");
        }
      }
    } catch (error) {
      console.error("Error saving document:", error);
      setError("Failed to save document. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await fetch(
        `/api/vehicles/${vehicleId}/documents/${docId}`,
        {
          method: "DELETE",
        },
      );
      if (response.ok) {
        fetchDocuments();
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete document");
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading documents...</div>;
  }

  // Separate invoices from other documents
  const invoices = documents.filter((doc) => doc.category === "INVOICE");
  const otherDocuments = documents.filter((doc) => doc.category !== "INVOICE");

  const renderDocumentList = (docs: Document[]) => {
    if (docs.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">No documents found</div>
      );
    }

    return (
      <div className="space-y-3">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2C2C2C] rounded-lg border border-gray-200 dark:border-[#2C2C2C] hover:bg-gray-100 dark:hover:bg-[#333] transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-medium">{doc.name}</span>
                {doc.visibleToCustomer && (
                  <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">
                    Customer Visible
                  </span>
                )}
                {doc.stage && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                    {stageLabels[doc.stage]}
                  </span>
                )}
                {!doc.stage && (
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded">
                    General
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-[#A1A1A1]">
                {documentCategories[doc.category]}
              </div>
              {doc.description && (
                <div className="text-sm text-gray-500 dark:text-[#A1A1A1] mt-1">
                  {doc.description}
                </div>
              )}
              <div className="text-xs text-gray-400 dark:text-[#666] mt-1">
                Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm"
              >
                View
              </a>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenDialog(doc)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteDocument(doc.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Document Library</h3>
        <Button onClick={() => handleOpenDialog()}>Upload Document</Button>
      </div>

      {/* Tabs for Documents and Invoices */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">
              description
            </span>
            Documents ({otherDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">receipt</span>
            Invoices ({invoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4">
          {renderDocumentList(otherDocuments)}
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          {renderDocumentList(invoices)}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold">
              {editingDocument ? "Edit Document" : "Upload Document"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {editingDocument
                ? "Update document information. File cannot be changed."
                : "Upload a new document. Accepted formats: PDF, JPG, PNG, DOC, DOCX (max 10MB). File upload is required."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file" className="text-sm font-medium">
                File <span className="text-destructive">*</span>
              </Label>
              {editingDocument ? (
                <div className="p-3 rounded-md bg-muted/50 border border-border flex items-start gap-2">
                  <span className="material-symbols-outlined text-lg text-primary mt-0.5">
                    description
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {editingDocument.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      File cannot be changed when editing
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      disabled={uploading}
                      className="h-11 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                  </div>
                  {file && (
                    <div className="mt-2 p-3 rounded-md bg-muted/50 border border-border flex items-start gap-2">
                      <span className="material-symbols-outlined text-lg text-primary mt-0.5">
                        description
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatFileSize(file.size)}
                          {uploading && " • Uploading..."}
                          {formData.fileUrl && !uploading && " • Uploaded"}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Document Name */}
            <div className="space-y-2">
              <Label htmlFor="documentName" className="text-sm font-medium">
                Document Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="documentName"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter document name"
                className="h-11"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category || undefined}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    category: value as DocumentCategory,
                  }))
                }
              >
                <SelectTrigger id="category" className="h-11">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(documentCategories)
                    .filter(
                      ([value]) =>
                        !hiddenCategories.includes(value as DocumentCategory),
                    )
                    .map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage Tag */}
            <div className="space-y-2">
              <Label htmlFor="stageTag" className="text-sm font-medium">
                Stage Tag{" "}
                <span className="text-muted-foreground text-xs">
                  (Optional)
                </span>
              </Label>
              <Select
                value={formData.stage || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    stage: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger id="stageTag" className="h-11">
                  <SelectValue placeholder="Select stage tag (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Stage Tag (General)</SelectItem>
                  <SelectItem value="PURCHASE">Purchase</SelectItem>
                  <SelectItem value="TRANSPORT">Transport</SelectItem>
                  <SelectItem value="REPAIR">Repair</SelectItem>
                  <SelectItem value="DOCUMENTS">Documents</SelectItem>
                  <SelectItem value="BOOKING">Booking</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="DHL">DHL</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5">
                <span className="material-symbols-outlined text-xs mt-0.5">
                  info
                </span>
                All documents appear in the General Library. Tagging helps
                filter by stage.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description{" "}
                <span className="text-muted-foreground text-xs">
                  (Optional)
                </span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
                placeholder="Add any additional notes about this document..."
                className="resize-none"
              />
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-start space-x-3 p-3 rounded-md bg-muted/30 border border-border">
              <Checkbox
                id="visibleToCustomer"
                checked={formData.visibleToCustomer}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    visibleToCustomer: !!checked,
                  }))
                }
                className="mt-0.5"
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor="visibleToCustomer"
                  className="text-sm font-medium cursor-pointer"
                >
                  Visible to Customer
                </Label>
                <p className="text-xs text-muted-foreground">
                  This document will be visible in the customer portal
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
                <span className="material-symbols-outlined text-destructive text-sm mt-0.5">
                  error
                </span>
                <p className="text-sm text-destructive flex-1">{error}</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setError(null);
              }}
              disabled={saving || uploading}
              className="h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDocument}
              disabled={
                saving ||
                uploading ||
                !formData.name ||
                !formData.category ||
                !formData.fileUrl
              }
              className="h-10 min-w-[120px]"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm animate-spin">
                    sync
                  </span>
                  {editingDocument ? "Updating..." : "Saving..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">
                    save
                  </span>
                  {editingDocument ? "Update" : "Save"} Document
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
