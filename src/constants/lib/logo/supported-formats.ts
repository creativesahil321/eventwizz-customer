/** Matches remove.bg upload support: JPG, PNG, WebP (see remove.bg help docs). */
export const LOGO_SUPPORTED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
] as const;

export type LogoSupportedMimeType = (typeof LOGO_SUPPORTED_MIME_TYPES)[number];

export const LOGO_SUPPORTED_ACCEPT = {
  "image/png": [],
  "image/jpeg": [],
  "image/jpg": [],
  "image/webp": [],
} as const;

export const LOGO_SUPPORTED_FORMATS_LABEL = "PNG, JPG, or WebP";

export const LOGO_UPLOAD_HINT =
  "Use a simple logo on a plain or transparent background for best results. PNG with transparency is ideal.";

export function isLogoSupportedMimeType(type: string): boolean {
  return (LOGO_SUPPORTED_MIME_TYPES as readonly string[]).includes(type);
}
