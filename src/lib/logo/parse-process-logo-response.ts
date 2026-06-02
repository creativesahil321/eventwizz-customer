import type { ProcessLogoFileResult } from "./process-logo-client";

export function parseProcessLogoResponse(
  response: Response,
  blob: Blob,
  baseName: string,
): ProcessLogoFileResult {
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

export function showLogoProcessToasts(result: ProcessLogoFileResult): void {
  void import("sonner").then(({ toast }) => {
    if (result.backgroundRemovalFailed) {
      toast.warning("Background could not be removed", {
        description:
          result.backgroundRemovalError ??
          "remove.bg is unavailable. Only plain white backgrounds are cleaned automatically — upload a PNG with transparency for best results.",
        duration: 8000,
      });
      return;
    }

    if (result.invertedForContrast) {
      toast.success(
        result.headerIsLight
          ? "Logo adjusted for light header visibility"
          : "Logo adjusted for dark header visibility",
      );
      return;
    }

    if (result.processMethod === "remove-bg") {
      toast.success("Logo background removed");
      return;
    }

    toast.success("Logo ready for your site header");
  });
}
