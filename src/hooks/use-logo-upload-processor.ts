"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { processLogoFile } from "@/lib/logo/process-logo-client";

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

        if (result.backgroundRemovalFailed) {
          toast.warning("Background could not be removed", {
            description:
              result.backgroundRemovalError ??
              "remove.bg is unavailable. Only plain white backgrounds are cleaned automatically — upload a PNG with transparency for best results.",
            duration: 8000,
          });
        } else if (result.invertedForContrast) {
          toast.success(
            result.headerIsLight
              ? "Logo adjusted for light header visibility"
              : "Logo adjusted for dark header visibility",
          );
        } else if (result.processMethod === "remove-bg") {
          toast.success("Logo background removed");
        } else {
          toast.success("Logo ready for your site header");
        }

        return result.file;
      } catch (error) {
        console.error("Logo processing failed:", error);
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

  return { processUpload, isProcessing };
}
