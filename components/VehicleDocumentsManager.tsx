"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  /** Bump to refetch documents list (e.g. after upload from stage management). */
  refreshTrigger?: number;
}

const documentCategories: Record<DocumentCategory, string> = {
  INVOICE: "Invoice",
  PHOTOS: "Photos and Videos",
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
  RELEASED_BILL_OF_LADING: "Released Bill of Lading (B/L)",
  AUCTION_SHEET: "Auction Sheet",
  OTHER: "Other",
};

// No categories to hide - all remaining categories are actual documents
const hiddenCategories: DocumentCategory[] = [];

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

// Format file size
const formatFileSize = (bytes: number | null | undefined) => {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function VehicleDocumentsManager({
  vehicleId,
  currentStage,
  refreshTrigger,
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
  const [multiFiles, setMultiFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const isMultiMediaMode = formData.category === "PHOTOS";

  const fetchDocuments = useCallback(async () => {
    try {
      // Fetch ALL documents (no stage filter)
      const response = await fetch(`/api/vehicles/${vehicleId}/documents`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, refreshTrigger]);

  const isImageOrVideo = (f: File) => {
    const t = f.type.toLowerCase();
    return t.startsWith("image/") || t.startsWith("video/");
  };

  const validateAndProcessFile = async (selectedFile: File) => {
    setError(null);
    const isMedia = isImageOrVideo(selectedFile);
    const maxSize = isMedia ? 150 * 1024 * 1024 : 10 * 1024 * 1024; // 150MB for media, 10MB for docs
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm", ".mov", ".doc", ".docx"];

    if (selectedFile.size > maxSize) {
      setError(isMedia ? "File size must be less than 150MB" : "File size must be less than 10MB");
      return;
    }

    const lastDotIndex = selectedFile.name.lastIndexOf(".");
    const fileExtension = lastDotIndex >= 0
      ? selectedFile.name.toLowerCase().substring(lastDotIndex)
      : "";
    if (
      !allowedTypes.includes(selectedFile.type) &&
      !allowedExtensions.includes(fileExtension) &&
      !isImageOrVideo(selectedFile)
    ) {
      setError(
        "Invalid file type. Accepted: PDF, images, video (MP4/WebM/MOV), DOC, DOCX",
      );
      return;
    }

    setFile(selectedFile);
    setFormData((prev) => ({ ...prev, name: selectedFile.name }));

    try {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append("file", selectedFile);
      uploadFormData.append("context", "vehicle");
      uploadFormData.append("vehicleId", vehicleId);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
        credentials: "include",
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
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editingDocument) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (editingDocument) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await validateAndProcessFile(droppedFile);
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
    setMultiFiles([]);
    setIsDragging(false);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (formData.category !== "PHOTOS") setMultiFiles([]);
  }, [formData.category]);

  const handleMultiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length) return;
    setError(null);
    const maxSize = 150 * 1024 * 1024;
    const valid: File[] = [];
    for (let i = 0; i < selected.length; i++) {
      const f = selected[i];
      if (!isImageOrVideo(f)) {
        setError("Only images and videos are allowed (e.g. JPG, PNG, MP4, WebM).");
        e.target.value = "";
        return;
      }
      if (f.size > maxSize) {
        setError(`${f.name} is over 150MB. Each file must be under 150MB.`);
        e.target.value = "";
        return;
      }
      valid.push(f);
    }
    setMultiFiles((prev) => [...prev, ...valid]);
    e.target.value = "";
  };

  const removeMultiFile = (index: number) => {
    setMultiFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveDocument = async () => {
    setError(null);

    if (!formData.category) {
      setError("Please select a category");
      return;
    }

    const isPhotosMulti = isMultiMediaMode && !editingDocument && multiFiles.length > 0;
    if (isPhotosMulti) {
      // Save path: upload each file and create one document per file
    } else if (isMultiMediaMode && !editingDocument) {
      setError("Select at least one photo or video");
      return;
    } else {
      if (!formData.name) {
        setError("Please fill in document name");
        return;
      }
      if (!formData.fileUrl) {
        setError("Please upload a file");
        return;
      }
    }

    try {
      setSaving(true);
      if (isPhotosMulti) {
        const created: { name: string; fileUrl: string; fileType: string; fileSize: number }[] = [];
        for (const f of multiFiles) {
          const uploadFormData = new FormData();
          uploadFormData.append("file", f);
          uploadFormData.append("context", "vehicle");
          uploadFormData.append("vehicleId", vehicleId);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: uploadFormData,
            credentials: "include",
          });
          if (!uploadRes.ok) {
            const err = await uploadRes.json().catch(() => ({}));
            setError(err.error || `Failed to upload ${f.name}`);
            setSaving(false);
            return;
          }
          const data = await uploadRes.json();
          created.push({ name: f.name, fileUrl: data.url, fileType: f.type, fileSize: f.size });
        }
        for (const c of created) {
          const res = await fetch(`/api/vehicles/${vehicleId}/documents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              ...formData,
              name: c.name,
              fileUrl: c.fileUrl,
              stage: formData.stage || null,
              fileType: c.fileType,
              fileSize: c.fileSize,
            }),
          });
          if (!res.ok) {
            const errData = await res.json();
            setError(errData.error || "Failed to create one or more documents");
            setSaving(false);
            return;
          }
        }
        fetchDocuments();
        setDialogOpen(false);
        setMultiFiles([]);
        setError(null);
        setSaving(false);
        return;
      }
      if (editingDocument) {
        // Update existing document
        const response = await fetch(
          `/api/vehicles/${vehicleId}/documents/${editingDocument.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
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
          credentials: "include",
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
          credentials: "include",
        },
      );
      if (response.ok) {
        fetchDocuments();
      } else {
        let errorMessage = "Failed to delete document";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete document. Please try again.");
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading documents...</div>;
  }

  const invoices = documents.filter((doc) => doc.category === "INVOICE");
  const mediaDocs = documents.filter((doc) => doc.category === "PHOTOS");
  const otherDocuments = documents.filter(
    (doc) => doc.category !== "INVOICE" && doc.category !== "PHOTOS",
  );

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
        <Button type="button" onClick={() => handleOpenDialog()}>Upload Document</Button>
      </div>

      {/* Tabs: Documents, Photos and Videos, Invoices */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">
              description
            </span>
            Documents ({otherDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="photos" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">photo_library</span>
            Photos and Videos ({mediaDocs.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">receipt</span>
            Invoices ({invoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4">
          {renderDocumentList(otherDocuments)}
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          {renderDocumentList(mediaDocs)}
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          {renderDocumentList(invoices)}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">
                {editingDocument ? "edit_document" : "upload_file"}
              </span>
              {editingDocument ? "Edit Document" : "Upload Document"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {editingDocument
                ? "Update document information. File cannot be changed."
                : isMultiMediaMode
                  ? "Select multiple photos and videos. Images and video (e.g. MP4, WebM) up to 150MB each."
                  : "Upload a new document. Accepted formats: PDF, JPG, PNG, DOC, DOCX (max 10MB)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 px-6 pb-4">
            {/* Category – first so user picks type (e.g. Photos) before uploading */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base">category</span>
                Category
                <span className="text-destructive">*</span>
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

            {/* File Upload */}
            <div className="space-y-3">
              <Label htmlFor="file" className="text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base">attach_file</span>
                File Upload
                <span className="text-destructive">*</span>
              </Label>
              {editingDocument ? (
                <div className="p-4 rounded-lg bg-muted/50 border-2 border-border flex items-start gap-3">
                  <div className="p-2 rounded-md bg-primary/10 dark:bg-primary/20">
                    <span className="material-symbols-outlined text-xl text-primary">
                      description
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {editingDocument.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">info</span>
                      File cannot be changed when editing
                    </p>
                  </div>
                </div>
              ) : isMultiMediaMode ? (
                <>
                  <input
                    ref={multiFileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleMultiFileChange}
                    className="hidden"
                  />
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => multiFileInputRef.current?.click()}
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-3">
                      <span className="material-symbols-outlined text-3xl text-muted-foreground">
                        photo_library
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      Add photos and videos
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Images and video (MP4, WebM, MOV) up to 150MB each
                    </p>
                  </div>
                  {multiFiles.length > 0 && (
                    <ul className="mt-3 space-y-2 max-h-48 overflow-y-auto rounded-lg border bg-muted/30 p-2">
                      {multiFiles.map((f, i) => (
                        <li
                          key={`${f.name}-${i}`}
                          className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded bg-background border"
                        >
                          <span className="truncate min-w-0">{f.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(f.size)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => removeMultiFile(i)}
                            aria-label={`Remove ${f.name}`}
                          >
                            <span className="material-symbols-outlined text-lg">close</span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <>
                  {/* Drag and Drop Zone */}
                  <div
                    ref={dropZoneRef}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${
                      isDragging
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                    } ${uploading ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      disabled={uploading}
                      className="hidden"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="p-8 text-center">
                      {file && formData.fileUrl && !uploading ? (
                        <div className="space-y-3">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
                            <span className="material-symbols-outlined text-3xl text-green-600 dark:text-green-400">
                              check_circle
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatFileSize(file.size)} • Uploaded successfully
                            </p>
                          </div>
                        </div>
                      ) : uploading ? (
                        <div className="space-y-3">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20">
                            <span className="material-symbols-outlined text-3xl text-primary animate-spin">
                              sync
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {file?.name || "Uploading..."}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Please wait while we upload your file
                            </p>
                          </div>
                        </div>
                      ) : file ? (
                        <div className="space-y-3">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20">
                            <span className="material-symbols-outlined text-3xl text-primary">
                              description
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatFileSize(file.size)} • Ready to upload
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                            <span className="material-symbols-outlined text-3xl text-muted-foreground">
                              cloud_upload
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              Drop your file here, or{" "}
                              <span className="text-primary underline">browse</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              PDF, JPG, PNG, DOC, DOCX (max 10MB)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex-1 h-10"
                    >
                      <span className="material-symbols-outlined text-base mr-2">
                        folder_open
                      </span>
                      Choose File
                    </Button>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={uploading}
                      className="h-10 px-4"
                      aria-label="Take photo with camera"
                    >
                      <span className="material-symbols-outlined text-base">
                        camera
                      </span>
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Document Name – hidden when uploading multiple photos/videos */}
            {!(isMultiMediaMode && !editingDocument) && (
              <div className="space-y-2">
                <Label htmlFor="documentName" className="text-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">title</span>
                  Document Name
                  <span className="text-destructive">*</span>
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
            )}

            {/* Stage Tag */}
            <div className="space-y-2">
              <Label htmlFor="stageTag" className="text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base">local_offer</span>
                Stage Tag
                <span className="text-muted-foreground text-xs font-normal">
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
              <Label htmlFor="description" className="text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base">notes</span>
                Description
                <span className="text-muted-foreground text-xs font-normal">
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
              <div className="rounded-lg bg-destructive/10 dark:bg-destructive/20 border-2 border-destructive/30 dark:border-destructive/40 p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-destructive text-lg mt-0.5">
                  error
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">Error</p>
                  <p className="text-sm text-destructive/90 mt-1">{error}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setError(null);
                  setIsDragging(false);
                }}
                disabled={saving || uploading}
                className="h-11 min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveDocument}
                disabled={
                  saving ||
                  uploading ||
                  !formData.category ||
                  (isMultiMediaMode && !editingDocument
                    ? multiFiles.length === 0
                    : !formData.name || !formData.fileUrl)
                }
                className="h-11 min-w-[140px]"
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
                      {editingDocument ? "edit" : "upload_file"}
                    </span>
                    {editingDocument ? "Update" : "Upload"} Document
                  </span>
                )}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

}
