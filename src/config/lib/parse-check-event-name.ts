import type { ApiResponse } from "@/services/core/api-client";

export type CheckEventNameAvailability = {
  available: boolean;
  message?: string;
};

type CheckEventNameData = {
  available?: boolean;
  is_available?: boolean;
  exists?: boolean;
  is_unique?: boolean;
};

/** Normalizes `/vendor/events/check-name` responses into a single availability result. */
export function parseCheckEventNameResponse(
  response: ApiResponse<CheckEventNameData> | CheckEventNameData | null | undefined,
): CheckEventNameAvailability {
  const isApiResponse =
    response &&
    typeof response === "object" &&
    "status" in response &&
    "data" in response;

  const payload = isApiResponse
    ? (response as ApiResponse<CheckEventNameData>).data
    : (response as CheckEventNameData | undefined);

  const message = isApiResponse
    ? String((response as ApiResponse<CheckEventNameData>).message ?? "").trim() ||
      undefined
    : undefined;

  // Top-level status wins — backend may return is_unique: true with status: false.
  if (isApiResponse && (response as ApiResponse<CheckEventNameData>).status === false) {
    return {
      available: false,
      message: message || "This event name is already in use",
    };
  }

  if (typeof payload?.available === "boolean") {
    return { available: payload.available, message };
  }
  if (typeof payload?.is_available === "boolean") {
    return { available: payload.is_available, message };
  }
  if (typeof payload?.is_unique === "boolean") {
    return { available: payload.is_unique, message };
  }
  if (typeof payload?.exists === "boolean") {
    return { available: !payload.exists, message };
  }

  return { available: true, message };
}
