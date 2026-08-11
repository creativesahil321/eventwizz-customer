import { toast } from "sonner";
import type { ProcessLogoFileResult } from "./process-logo-client";
import { LOGO_SUPPORTED_FORMATS_LABEL, LOGO_UPLOAD_HINT } from "./supported-formats";

export type LogoProcessNotice =
  | "none"
  | "basic_cleanup"
  | "credits_unavailable"
  | "foreground_unrecognized";

export function classifyBackgroundRemovalError(
  message: string,
): LogoProcessNotice {
  const lower = message.toLowerCase();

  if (
    lower.includes("insufficient credit") ||
    lower.includes("insufficient credits")
  ) {
    return "credits_unavailable";
  }

  if (
    lower.includes("could not identify foreground") ||
    lower.includes("identify foreground") ||
    lower.includes("foreground")
  ) {
    return "foreground_unrecognized";
  }

  return "basic_cleanup";
}

type LogoProcessToast = {
  variant: "success" | "warning" | "message";
  title: string;
  description?: string;
};

function noticeDescription(notice: LogoProcessNotice): string | undefined {
  switch (notice) {
    case "foreground_unrecognized":
      return `${LOGO_UPLOAD_HINT} Supported formats: ${LOGO_SUPPORTED_FORMATS_LABEL}.`;
    case "credits_unavailable":
      return "Automatic background removal is temporarily unavailable. We applied basic cleanup for your header instead.";
    case "basic_cleanup":
      return "We applied basic cleanup for your header color.";
    default:
      return undefined;
  }
}

export function getLogoProcessToast(
  result: ProcessLogoFileResult,
): LogoProcessToast {
  const notice = result.processNotice ?? "none";

  if (result.invertedForContrast) {
    return {
      variant: "success",
      title: "Logo adjusted for your header",
      description: notice !== "none" ? noticeDescription(notice) : undefined,
    };
  }

  if (result.processMethod === "remove-bg" && !result.backgroundRemovalFailed) {
    return {
      variant: "success",
      title: "Logo ready for your site header",
      description: "Background removed successfully.",
    };
  }

  if (result.backgroundRemovalFailed) {
    const description = noticeDescription(notice ?? "basic_cleanup");
    return {
      variant: notice === "credits_unavailable" ? "warning" : "message",
      title:
        notice === "credits_unavailable"
          ? "Background removal unavailable"
          : "Logo ready with basic cleanup",
      description,
    };
  }

  return {
    variant: "success",
    title: "Logo ready for your site header",
  };
}

/** Vendor-safe copy — never surface raw third-party API errors in the UI. */
export function getFriendlyLogoOptimizeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Please try uploading your logo again.";
  }

  const lower = error.message.toLowerCase();

  if (lower.includes("logo url must use http")) {
    return "Save your logo first, then upload it again.";
  }

  if (lower.includes("no logo available")) {
    return "Upload a logo first, then try again.";
  }

  return `Please try again with ${LOGO_SUPPORTED_FORMATS_LABEL}. ${LOGO_UPLOAD_HINT}`;
}

export function showLogoProcessToasts(result: ProcessLogoFileResult): void {
  const { variant, title, description } = getLogoProcessToast(result);
  const options = description
    ? { description, duration: 7000, position: "top-center" as const }
    : { duration: 7000, position: "top-center" as const };

  if (variant === "success") {
    toast.success(title, options);
    return;
  }

  if (variant === "warning") {
    toast.warning(title, options);
    return;
  }

  toast.message(title, options);
}
