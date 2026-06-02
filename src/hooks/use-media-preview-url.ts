"use client";

import { useEffect, useMemo } from "react";

type MediaPreviewInput =
  | string
  | File
  | null
  | undefined
  | { preview?: string };

/**
 * Resolves string URLs, blob preview URLs on File objects, or attached `.preview`.
 */
export function useMediaPreviewUrl(
  value: MediaPreviewInput,
): string | null {
  const file = value instanceof File ? value : null;

  const attachedPreview =
    file && "preview" in file && typeof file.preview === "string"
      ? file.preview
      : null;

  const blobUrl = useMemo(() => {
    if (file && !attachedPreview) return URL.createObjectURL(file);
    return null;
  }, [file, attachedPreview]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (!value) return null;
  if (typeof value === "string") return value;
  if (file) return attachedPreview ?? blobUrl;
  if (
    typeof value === "object" &&
    "preview" in value &&
    typeof value.preview === "string"
  ) {
    return value.preview;
  }
  return null;
}
