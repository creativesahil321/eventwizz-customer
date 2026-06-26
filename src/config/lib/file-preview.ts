/** Attach a stable blob preview URL to an uploaded File (used by onboarding preview). */
export function ensureFilePreview(file: File): File & { preview: string } {
  const withPreview = file as File & { preview?: string };
  if (!withPreview.preview) {
    withPreview.preview = URL.createObjectURL(file);
  }
  return withPreview as File & { preview: string };
}

export function revokeFilePreview(file: File | null | undefined): void {
  if (!file) return;
  const preview = (file as File & { preview?: string }).preview;
  if (preview?.startsWith("blob:")) {
    URL.revokeObjectURL(preview);
  }
}
