/**
 * Sends an uploaded logo to the Next.js processing route and returns a PNG
 * optimized for the vendor site header (transparent background + contrast).
 */
export type ProcessLogoFileResult = {
  file: File;
  invertedForContrast: boolean;
  headerIsLight: boolean;
  processMethod: "sharp" | "remove-bg" | "passthrough";
  backgroundRemovalFailed: boolean;
  backgroundRemovalError?: string;
};

type ProcessLogoOptions = {
  headerBackgroundColor?: string;
};

function appendHeaderBackground(
  formData: FormData,
  options?: ProcessLogoOptions,
): void {
  if (options?.headerBackgroundColor) {
    formData.append("header_background", options.headerBackgroundColor);
  }
}

async function postLogoProcessFormData(
  formData: FormData,
): Promise<Response> {
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

  return response;
}

export async function processLogoFile(
  file: File,
  options?: ProcessLogoOptions,
): Promise<ProcessLogoFileResult> {
  const formData = new FormData();
  formData.append("logo", file);
  appendHeaderBackground(formData, options);

  const response = await postLogoProcessFormData(formData);
  const blob = await response.blob();
  const baseName = file.name.replace(/\.[^.]+$/, "") || "logo";

  const { parseProcessLogoResponse } = await import("./parse-process-logo-response");
  return parseProcessLogoResponse(response, blob, baseName);
}

/** Re-process an existing logo already stored on the server (Sites Essentials saved URL). */
export async function processLogoFromUrl(
  logoUrl: string,
  options?: ProcessLogoOptions,
): Promise<ProcessLogoFileResult> {
  const formData = new FormData();
  formData.append("logo_url", logoUrl);
  appendHeaderBackground(formData, options);

  const response = await postLogoProcessFormData(formData);
  const blob = await response.blob();
  const baseName =
    logoUrl.split("/").pop()?.split("?")[0]?.replace(/\.[^.]+$/, "") ||
    "logo";

  const { parseProcessLogoResponse } = await import("./parse-process-logo-response");
  return parseProcessLogoResponse(response, blob, baseName);
}
