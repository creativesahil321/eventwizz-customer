import type { LogoProcessNotice } from "./logo-process-notices";
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
  const processNoticeRaw = response.headers.get("X-Logo-Process-Notice");
  const processNotice =
    processNoticeRaw &&
    processNoticeRaw !== "none" &&
    [
      "basic_cleanup",
      "credits_unavailable",
      "foreground_unrecognized",
    ].includes(processNoticeRaw)
      ? (processNoticeRaw as LogoProcessNotice)
      : undefined;

  return {
    file: new File([blob], `${baseName}.png`, { type: "image/png" }),
    invertedForContrast,
    headerIsLight,
    processMethod,
    backgroundRemovalFailed,
    processNotice,
  };
}
