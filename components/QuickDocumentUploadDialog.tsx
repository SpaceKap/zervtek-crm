"use client";

import { useState, useEffect, useRef } from "react";
import { DocumentCategory, ShippingStage } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface QuickDocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  category: DocumentCategory;
  stage: ShippingStage | null;
  documentName: string;
  onSuccess?: () => void;
}

export function QuickDocumentUploadDialog({
  open,
  onOpenChange,
  vehicleId,
  category,
  stage,
  documentName,
  onSuccess,
}: QuickDocumentUploadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFile(null);
      setDescription("");
      setError(null);
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        setError("File size must be less than 10MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleUpload = async () => {
    setError(null);

    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    try {
      setLoading(true);

      // Upload file first
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("context", "vehicle");
      uploadFormData.append("vehicleId", vehicleId);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        setError("Failed to upload file. Please try again.");
        return;
      }

      const uploadData = await uploadResponse.json();

      // Create document record
      const response = await fetch(`/api/vehicles/${vehicleId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: documentName || file.name,
          category,
          stage: stage || null,
          fileUrl: uploadData.url,
          fileType: file.type || null,
          fileSize: file.size || null,
          description: description || null,
          visibleToCustomer: false, // Default to false, can be changed in Document Library
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create document");
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      setError("Failed to upload document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader className="space-y-3 px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold">
            Upload {documentName}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Upload the required document. Accepted formats: PDF, JPG, PNG, DOC,
            DOCX (max 10MB).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-2">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file" className="text-sm font-medium">
              File <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="h-11 flex-1 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
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
                size="icon"
                onClick={() => cameraInputRef.current?.click()}
                className="h-11 shrink-0"
                aria-label="Take photo with camera"
              >
                <span className="material-symbols-outlined text-lg">
                  camera
                </span>
              </Button>
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
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description{" "}
              <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add any additional notes about this document..."
              className="resize-none"
            />
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

        <DialogFooter className="gap-2 sm:gap-0 px-6 pb-6 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={loading || !file}
            className="h-10 min-w-[140px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm animate-spin">
                  sync
                </span>
                Uploading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">
                  upload
                </span>
                Upload Document
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
