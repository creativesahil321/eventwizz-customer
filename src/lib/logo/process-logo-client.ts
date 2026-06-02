/**
 * Sends an uploaded logo to the Next.js processing route and returns a PNG
 * optimized for the white vendor site header (transparent background).
 */
export type ProcessLogoFileResult = {
  file: File;
  invertedForContrast: boolean;
  headerIsLight: boolean;
  processMethod: "sharp" | "remove-bg" | "passthrough";
  backgroundRemovalFailed: boolean;
  backgroundRemovalError?: string;
};

export async function processLogoFile(
  file: File,
  options?: { headerBackgroundColor?: string },
): Promise<ProcessLogoFileResult> {
  const formData = new FormData();
  formData.append("logo", file);
  if (options?.headerBackgroundColor) {
    formData.append("header_background", options.headerBackgroundColor);
  }

  const response = await fetch("/api/logo/process", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Logo processing failed");
  }

  const blob = await response.blob();
  const baseName = file.name.replace(/\.[^.]+$/, "") || "logo";
  const invertedForContrast =
    response.headers.get("X-Logo-Inverted-For-Contrast") === "true";
  const headerIsLight =
    response.headers.get("X-Logo-Header-Is-Light") !== "false";
  const processMethod =
    (response.headers.get("X-Logo-Process-Method") as
      | ProcessLogoFileResult["processMethod"]
      | null) ?? "sharp";
  const backgroundRemovalFailed =
    response.headers.get("X-Logo-Background-Removal-Failed") === "true";
  const backgroundRemovalError =
    response.headers.get("X-Logo-Background-Removal-Error") ?? undefined;

  return {
    file: new File([blob], `${baseName}.png`, { type: "image/png" }),
    invertedForContrast,
    headerIsLight,
    processMethod,
    backgroundRemovalFailed,
    backgroundRemovalError,
  };
}
