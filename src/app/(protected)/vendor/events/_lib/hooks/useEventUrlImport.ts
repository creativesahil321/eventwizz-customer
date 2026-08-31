import { useState } from "react";
import type {
  EventImportErrorBody,
  EventImportRequestBody,
  EventImportResult,
} from "@/app/api/ai/import-event/types";

export type EventUrlImportClientError = {
  message: string;
  hint?: string;
  code?: EventImportErrorBody["code"];
};

export function useEventUrlImport() {
  const [isImporting, setIsImporting] = useState(false);

  const importEvent = async (
    url: string,
    options: Pick<EventImportRequestBody, "rewrite"> = {},
  ): Promise<{
    data: EventImportResult | null;
    error: EventUrlImportClientError | null;
  }> => {
    setIsImporting(true);
    try {
      const response = await fetch("/api/ai/import-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          rewrite: options.rewrite !== false,
        }),
      });
      const payload = (await response.json()) as
        | EventImportResult
        | EventImportErrorBody;

      if (!response.ok) {
        const errorBody = payload as EventImportErrorBody;
        return {
          data: null,
          error: {
            message: errorBody.error || "We could not analyse this event page.",
            hint: errorBody.hint,
            code: errorBody.code,
          },
        };
      }

      return { data: payload as EventImportResult, error: null };
    } catch {
      return {
        data: null,
        error: {
          message: "We could not reach the event importer.",
          hint: "Check your connection and try again in a moment.",
          code: "server_error",
        },
      };
    } finally {
      setIsImporting(false);
    }
  };

  return { importEvent, isImporting };
}
