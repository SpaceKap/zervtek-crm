"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, X, ChevronLeft, ChevronRight } from "lucide-react";

type MediaDoc = {
  id: string;
  name: string;
  fileType: string | null;
  fileUrl: string;
};

export function MediaGridWithPreview({
  mediaDocs,
  mainAppUrl,
}: {
  mediaDocs: MediaDoc[];
  mainAppUrl: string;
}) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const resolveUrl = (doc: MediaDoc) =>
    doc.fileUrl.startsWith("http")
      ? doc.fileUrl
      : `${mainAppUrl}${doc.fileUrl.startsWith("/") ? "" : "/"}${doc.fileUrl}`;

  const total = mediaDocs.length;
  const currentDoc = previewIndex != null ? mediaDocs[previewIndex] : null;
  const goPrev = useCallback(() => {
    setPreviewIndex((i) => (i == null ? null : i <= 0 ? total - 1 : i - 1));
  }, [total]);
  const goNext = useCallback(() => {
    setPreviewIndex((i) => (i == null ? null : i >= total - 1 ? 0 : i + 1));
  }, [total]);

  useEffect(() => {
    if (previewIndex == null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewIndex(null);
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewIndex, goPrev, goNext]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {mediaDocs.map((doc, index) => {
          const isVideo = doc.fileType?.startsWith("video/");
          const url = resolveUrl(doc);
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => setPreviewIndex(index)}
              className="relative block rounded-lg border overflow-hidden bg-muted/30 aspect-square text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {isVideo ? (
                <video
                  src={url}
                  className="w-full h-full object-cover pointer-events-none"
                  preload="metadata"
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={url}
                  alt={doc.name}
                  className="w-full h-full object-cover"
                />
              )}
              {isVideo && (
                <span
                  className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg"
                  aria-hidden
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-white/90 text-black shadow-md">
                    <Play className="size-5 fill-current ml-0.5" />
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Lightbox overlay – preview with left/right arrows */}
      {currentDoc != null && previewIndex != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Media preview"
        >
          <button
            type="button"
            onClick={() => setPreviewIndex(null)}
            className="absolute top-4 right-4 z-10 rounded-full p-2 text-white/90 hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close preview"
          >
            <X className="size-6" />
          </button>

          {/* Left arrow */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 text-white/90 hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Previous"
          >
            <ChevronLeft className="size-8" />
          </button>

          {/* Right arrow */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 text-white/90 hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Next"
          >
            <ChevronRight className="size-8" />
          </button>

          <div
            className="relative max-h-full max-w-full mx-12"
            onClick={(e) => e.stopPropagation()}
          >
            {currentDoc.fileType?.startsWith("video/") ? (
              <video
                key={previewIndex}
                src={resolveUrl(currentDoc)}
                controls
                autoPlay
                className="max-h-[90vh] max-w-full rounded-lg"
                title={currentDoc.name}
              />
            ) : (
              <img
                key={previewIndex}
                src={resolveUrl(currentDoc)}
                alt={currentDoc.name}
                className="max-h-[90vh] max-w-full object-contain rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
