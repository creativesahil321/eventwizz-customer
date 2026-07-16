/**
 * Shared support chat attachment helpers (customer / vendor / admin composers).
 */

import { toast } from "sonner";

export const MAX_SUPPORT_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_SUPPORT_ATTACHMENTS = 5;

export const SUPPORT_ATTACHMENT_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

export const SUPPORT_IMAGE_ATTACHMENT_ACCEPT =
  ".png,.jpg,.jpeg,image/png,image/jpeg";

const ACCEPTED_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

const IMAGE_ATTACHMENT_TYPES = ["image/png", "image/jpeg", "image/jpg"];

export function formatSupportFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAcceptedSupportFile(file: File, imagesOnly: boolean): boolean {
  if (imagesOnly) {
    return (
      IMAGE_ATTACHMENT_TYPES.includes(file.type) ||
      /\.(png|jpe?g)$/i.test(file.name)
    );
  }
  return (
    ACCEPTED_ATTACHMENT_TYPES.includes(file.type) ||
    /\.(pdf|png|jpe?g)$/i.test(file.name)
  );
}

/** Validate + collect files for the support composer. Shows toasts on reject. */
export function collectSupportAttachments(
  fileList: FileList | null,
  options?: {
    imagesOnly?: boolean;
    /** Files already selected in the composer */
    currentCount?: number;
    maxCount?: number;
  }
): File[] {
  if (!fileList?.length) return [];

  const imagesOnly = Boolean(options?.imagesOnly);
  const currentCount = Math.max(0, options?.currentCount ?? 0);
  const maxCount = options?.maxCount ?? MAX_SUPPORT_ATTACHMENTS;
  const remaining = maxCount - currentCount;

  if (remaining <= 0) {
    toast.error(`You can attach up to ${maxCount} files.`);
    return [];
  }

  const next: File[] = [];
  let skippedForLimit = 0;

  for (const file of Array.from(fileList)) {
    if (next.length >= remaining) {
      skippedForLimit += 1;
      continue;
    }

    if (!isAcceptedSupportFile(file, imagesOnly)) {
      toast.error(
        imagesOnly
          ? `${file.name} is not a supported image type.`
          : `${file.name} is not a supported file type.`
      );
      continue;
    }
    if (file.size > MAX_SUPPORT_ATTACHMENT_BYTES) {
      toast.error(`${file.name} exceeds the 10 MB limit.`);
      continue;
    }
    next.push(file);
  }

  if (skippedForLimit > 0) {
    toast.error(`You can attach up to ${maxCount} files.`);
  }

  return next;
}
