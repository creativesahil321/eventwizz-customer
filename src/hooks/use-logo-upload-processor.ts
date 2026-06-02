"use client";

import { useCallback, useState } from "react";
import {
  processLogoFile,
  processLogoFromUrl,
} from "@/lib/logo/process-logo-client";
import { showLogoProcessToasts } from "@/lib/logo/parse-process-logo-response";

type UseLogoUploadProcessorOptions = {
  headerBackgroundColor?: string;
};

export function useLogoUploadProcessor(
  options: UseLogoUploadProcessorOptions = {},
) {
  const [isProcessing, setIsProcessing] = useState(false);
  const headerBackgroundColor = options.headerBackgroundColor;

  const processUpload = useCallback(
    async (file: File): Promise<File> => {
      setIsProcessing(true);
      try {
        const result = await processLogoFile(file, { headerBackgroundColor });
        showLogoProcessToasts(result);
        return result.file;
      } catch (error) {
        console.error("Logo processing failed:", error);
        const { toast } = await import("sonner");
        toast.message("Using original logo", {
          description: "Background cleanup was skipped.",
        });
        return file;
      } finally {
        setIsProcessing(false);
      }
    },
    [headerBackgroundColor],
  );

  const reprocessExistingUrl = useCallback(
    async (logoUrl: string): Promise<File | null> => {
      setIsProcessing(true);
      try {
        const result = await processLogoFromUrl(logoUrl, {
          headerBackgroundColor,
        });
        showLogoProcessToasts(result);
        return result.file;
      } catch (error) {
        console.error("Logo re-processing failed:", error);
        const { toast } = await import("sonner");
        toast.error("Could not optimize logo", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [headerBackgroundColor],
  );

  return { processUpload, reprocessExistingUrl, isProcessing };
}
