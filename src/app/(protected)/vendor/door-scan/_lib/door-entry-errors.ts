import axios from "axios";
import type { DoorEntryErrorCode } from "@/services/vendor/bookings/type";

const DOOR_ENTRY_ERROR_COPY: Record<DoorEntryErrorCode, string> = {
  already_admitted: "This guest is already checked in for that date.",
  not_paid: "This date is not fully paid. Entry is not allowed.",
  not_tonight: "This date is not today. Check in only on the event day.",
  cancelled: "This booking is cancelled.",
  refunded: "This booking was refunded.",
  invalid_token:
    "This QR code is not valid. Ask the guest for a current invoice.",
  wrong_venue:
    "This booking belongs to another venue. Switch location in the header and scan again.",
  permission_denied:
    "You do not have permission to use door entry. Ask an admin to grant booking access.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readErrorCode(source: unknown): string | null {
  if (!isRecord(source)) return null;
  if (typeof source.code === "string" && source.code.trim()) return source.code;
  if (isRecord(source.data) && typeof source.data.code === "string") {
    const code = source.data.code.trim();
    if (code) return code;
  }
  return null;
}

function readRequiredPermission(source: unknown): string | null {
  if (!isRecord(source) || !isRecord(source.data)) return null;
  const permission = source.data.required_permission;
  return typeof permission === "string" && permission.trim()
    ? permission.trim()
    : null;
}

function permissionDeniedMessage(requiredPermission: string | null): string {
  if (requiredPermission === "update-booking") {
    return "You cannot check guests in. Ask an admin for the update-booking permission.";
  }
  if (requiredPermission === "read-booking") {
    return "You cannot look up door-entry bookings. Ask an admin for the read-booking permission.";
  }
  return DOOR_ENTRY_ERROR_COPY.permission_denied;
}

export function getDoorEntryError(error: unknown): {
  code: string | null;
  message: string;
} {
  let code: string | null = null;
  let message = "Something went wrong. Try scanning again.";
  let requiredPermission: string | null = null;

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    code = readErrorCode(data);
    requiredPermission = readRequiredPermission(data);
    const apiMessage =
      isRecord(data) && typeof data.message === "string"
        ? data.message
        : undefined;
    if (apiMessage?.trim()) {
      message = apiMessage;
    }
  } else if (error instanceof Error) {
    message = error.message.trim() || message;
    code = (error as Error & { code?: string }).code ?? null;
  }

  if (code === "permission_denied") {
    return {
      code,
      message: permissionDeniedMessage(requiredPermission),
    };
  }

  if (code && code in DOOR_ENTRY_ERROR_COPY) {
    return {
      code,
      message: DOOR_ENTRY_ERROR_COPY[code as DoorEntryErrorCode],
    };
  }

  return { code, message };
}
