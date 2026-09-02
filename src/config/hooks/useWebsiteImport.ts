import { useState } from "react";
import { toast } from "sonner";
import type {
  WebsiteImportErrorBody,
  WebsiteImportResult,
} from "@/app/api/ai/import-website/types";

export type WebsiteImportClientError = {
  message: string;
  hint?: string;
  code?: WebsiteImportErrorBody["code"];
};

/**
 * Client hook for the "Import from website" flow.
 *
 * Calls the server route which fetches + analyzes the target site and returns
 * AI-structured Site Essentials content. Network/CORS is handled server-side.
 */
export function useWebsiteImport() {
  const [isImporting, setIsImporting] = useState(false);

  const importWebsite = async (
    url: string,
    options: { rewrite?: boolean } = {},
  ): Promise<{
    data: WebsiteImportResult | null;
    error: WebsiteImportClientError | null;
  }> => {
    setIsImporting(true);
    try {
      const response = await fetch("/api/ai/import-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, rewrite: options.rewrite !== false }),
      });

      const payload = (await response.json()) as
        | WebsiteImportResult
        | WebsiteImportErrorBody;

      if (!response.ok) {
        const err = payload as WebsiteImportErrorBody;
        const error: WebsiteImportClientError = {
          message:
            err.error ||
            "We could not analyse this website. Please try again.",
          hint: err.hint,
          code: err.code,
        };
        toast.error(error.message, {
          description: error.hint,
        });
        return { data: null, error };
      }

      const data = payload as WebsiteImportResult;

      if (data.warnings?.length) {
        toast.success("Website analysed", {
          description: data.warnings[0],
        });
      } else {
        toast.success("Website analysed", {
          description:
            "Review the imported content, then apply it to your site.",
        });
      }

      return { data, error: null };
    } catch {
      const error: WebsiteImportClientError = {
        message: "We could not reach our servers.",
        hint: "Check your internet connection and try again in a moment.",
        code: "server_error",
      };
      toast.error(error.message, { description: error.hint });
      return { data: null, error };
    } finally {
      setIsImporting(false);
    }
  };

  return { importWebsite, isImporting };
}
