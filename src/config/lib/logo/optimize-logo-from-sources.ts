/** Remote logo URLs the server can fetch for re-processing. */
export function isHttpLogoUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** In-browser preview URLs — must be processed via File upload, not server fetch. */
export function isLocalLogoUrl(url: string): boolean {
  return url.startsWith("blob:") || url.startsWith("data:");
}

/** Resolve relative storage paths to an absolute URL for server-side fetch. */
export function resolveRemoteLogoUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (isHttpLogoUrl(trimmed)) return trimmed;
  if (isLocalLogoUrl(trimmed)) return null;

  if (trimmed.startsWith("/")) {
    if (typeof window === "undefined") return null;
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
    const assetOrigin = apiBase.replace(/\/api\/v\d+\/?$/i, "") || window.location.origin;
    return `${assetOrigin.replace(/\/$/, "")}${trimmed}`;
  }

  return null;
}

async function blobUrlToFile(url: string, filename = "logo.png"): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Could not read local logo preview.");
  }
  const blob = await response.blob();
  return new File([blob], filename, {
    type: blob.type || "image/png",
  });
}

type OptimizeLogoInput = {
  logoUrl?: string;
  logoFile?: File | null;
  processUpload: (file: File) => Promise<File>;
  reprocessExistingUrl: (url: string) => Promise<File | null>;
};

/** Pick the correct processing path for saved URLs, blob previews, or unsaved Files. */
export async function optimizeLogoFromSources({
  logoUrl,
  logoFile,
  processUpload,
  reprocessExistingUrl,
}: OptimizeLogoInput): Promise<File | null> {
  if (logoFile instanceof File) {
    return processUpload(logoFile);
  }

  if (logoUrl) {
    if (isLocalLogoUrl(logoUrl)) {
      const file = await blobUrlToFile(logoUrl);
      return processUpload(file);
    }

    const remoteUrl = resolveRemoteLogoUrl(logoUrl);
    if (remoteUrl) {
      return reprocessExistingUrl(remoteUrl);
    }
  }

  throw new Error("No logo available to optimize.");
}
