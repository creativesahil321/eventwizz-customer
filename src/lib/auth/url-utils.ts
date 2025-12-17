import { toast } from "sonner";

/**
 * Handle error parameters from URL and display them as toasts
 * Cleans up the URL by removing the error parameter after processing
 */
export const handleUrlErrorParams = (): void => {
  if (typeof window === "undefined") return;

  const urlParams = new URLSearchParams(window.location.search);
  const errorParam = urlParams.get("error");

  if (errorParam) {
    const decodedError = decodeURIComponent(errorParam);

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
