import { toast } from "sonner";

/** Messages for the `?error=` codes the logout flow sets (see logout.ts). */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  session_expired: "Your session has expired. Please sign in again.",
  security_violation:
    "For your security, you've been signed out. Please sign in again.",
};

/**
 * Handle error parameters from URL and display them as toasts
 * Cleans up the URL by removing the error parameter after processing
 */
export const handleUrlErrorParams = (): void => {
  if (typeof window === "undefined") return;

  const urlParams = new URLSearchParams(window.location.search);
  const errorParam = urlParams.get("error");

  if (errorParam) {
    const decodedError =
      ERROR_CODE_MESSAGES[errorParam] ?? decodeURIComponent(errorParam);

    // Show the error as a toast with a slight delay to ensure it's visible
    setTimeout(() => {
      toast.error(decodedError, {
        duration: 5000,
        position: "top-center",
      });
    }, 100);

    // Clean up the URL by removing the error parameter
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete("error");
    window.history.replaceState({}, "", newUrl.toString());
  }
};
