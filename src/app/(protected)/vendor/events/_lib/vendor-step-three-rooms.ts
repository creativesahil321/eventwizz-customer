import type { StepThreeType } from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";
import {
  isVendorDateCancelled,
  isVendorDateReadonlyCancelled,
} from "@/app/(protected)/vendor/events/_lib/vendor-date-cancelled";

export type VendorStepThreeRoomEntry = {
  room_id: number;
  dates: StepThreeType["dates"];
};

type DateRow = StepThreeType["dates"][number];

export type VendorDateAction = NonNullable<DateRow["date_action"]>;

export {
  isVendorDateCancelled,
  isVendorDateReadonlyCancelled,
} from "@/app/(protected)/vendor/events/_lib/vendor-date-cancelled";

const hasNonEmpty = (value: unknown): boolean =>
  String(value ?? "").trim().length > 0;

function parseDateAction(value: unknown): VendorDateAction | undefined {
  return value === "cancel" ||
    value === "remove" ||
    value === "cancelled"
    ? value
    : undefined;
}

/** True when the date must be cancelled (kept in payload), not hard-removed. */
export function shouldUseCancelDateAction(
  date: Pick<DateRow, "date_action" | "use_cancel_date_action"> | undefined,
): boolean {
  if (!date) return false;
  // Already cancelled on the server — never offer Cancel / Undo again.
  if (isVendorDateReadonlyCancelled(date)) return false;
  return date.date_action === "cancel" || date.use_cancel_date_action === true;
}

/**
 * Clone a date row for "Duplicate" — clears persisted id + cancel/remove flags
 * so the new row behaves as a fresh removable date.
 */
export function cloneDateRowForDuplicate(date: DateRow): DateRow {
  const {
    id: _id,
    date_action: _dateAction,
    use_cancel_date_action: _useCancel,
    has_financial_bookings: _hasFinancial,
    has_bookings: _hasBookings,
    cancellation_request_pending: _pending,
    cancelled: _cancelled,
    cancel_reason: _reason,
    status: _status,
    is_cancelled: _isCancelled,
    is_readonly: _isReadonly,
    can_edit: _canEdit,
    cancelled_at: _cancelledAt,
    ...rest
  } = date;

  return {
    ...rest,
    event_date: "",
  };
}

/** True when at least one date row has meaningful user input. */
export function hasMeaningfulVendorDates(
  dates: StepThreeType["dates"] | undefined,
): boolean {
  if (!dates?.length) return false;
  return dates.some((date) => {
    if (hasNonEmpty(date?.event_date)) return true;
    const hasTickets =
      Array.isArray(date?.tickets) &&
      date.tickets.some(
        (t) =>
          hasNonEmpty(t?.title) ||
          hasNonEmpty(t?.description) ||
          hasNonEmpty(t?.total_capacity) ||
          hasNonEmpty(t?.price),
      );
    const hasTables =
      Array.isArray(date?.tables) &&
      date.tables.some(
        (t) =>
          hasNonEmpty(t?.min_persons) ||
          hasNonEmpty(t?.max_persons) ||
          hasNonEmpty(t?.price) ||
          hasNonEmpty(t?.total_tables),
      );
    return (
      hasTickets ||
      hasTables ||
      hasNonEmpty(date?.deposit_value) ||
      hasNonEmpty(date?.deposit_due_date)
    );
  });
}

function normalizeApiBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(trimmed)) return true;
    if (["false", "0", "no", "off", ""].includes(trimmed)) return false;
  }
  return undefined;
}

function parseOptionalFiniteNumber(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeTicketOrTableRow<T extends Record<string, unknown>>(
  raw: T,
): T {
  const status = normalizeApiBoolean(raw.status);
  const id = parseOptionalFiniteNumber(raw.id);
  const eventDateId = parseOptionalFiniteNumber(raw.event_date_id);
  const soldTickets = parseOptionalFiniteNumber(raw.sold_tickets);
  const soldTables = parseOptionalFiniteNumber(raw.sold_tables);

  return {
    ...raw,
    ...(id !== undefined ? { id } : {}),
    ...(eventDateId !== undefined ? { event_date_id: eventDateId } : {}),
    ...(soldTickets !== undefined ? { sold_tickets: soldTickets } : {}),
    ...(soldTables !== undefined ? { sold_tables: soldTables } : {}),
    ...(status !== undefined ? { status } : {}),
  };
}

export function normalizeVendorStepThreeDateRow(
  raw: Record<string, unknown>,
): DateRow {
  const depositDue =
    raw.deposit_due_date === null || raw.deposit_due_date === undefined
      ? ""
      : String(raw.deposit_due_date);

  const dateId = parseOptionalFiniteNumber(raw.id);
  const status = parseOptionalFiniteNumber(raw.status);
  const dateAction = parseDateAction(raw.date_action);
  const isCancelledFlag = normalizeApiBoolean(raw.is_cancelled);
  const cancelledFlag = normalizeApiBoolean(raw.cancelled);
  const isReadonlyFlag = normalizeApiBoolean(raw.is_readonly);
  const canEditFlag = normalizeApiBoolean(raw.can_edit);

  const cancelled =
    cancelledFlag === true ||
    isCancelledFlag === true ||
    dateAction === "cancelled" ||
    status === 2;

  const cancelReason = String(
    raw.cancel_reason ?? raw.cancellation_reason ?? "",
  ).trim();

  const cancelledAt =
    raw.cancelled_at === null || raw.cancelled_at === undefined
      ? undefined
      : String(raw.cancelled_at);

  return {
    ...(dateId !== undefined && dateId > 0 ? { id: dateId } : {}),
    event_date: String(raw.event_date ?? "").trim(),
    booking_type: (raw.booking_type as DateRow["booking_type"]) ?? "tickets",
    payment_type: raw.payment_type as DateRow["payment_type"] | undefined,
    is_deposit_enabled:
      raw.is_deposit_enabled === true || raw.is_deposit_enabled === 1,
    deposit_type: raw.deposit_type as DateRow["deposit_type"] | undefined,
    deposit_value: raw.deposit_value as DateRow["deposit_value"] | undefined,
    deposit_due_date: depositDue,
    total_table_types: Number(raw.total_table_types) || 0,
    total_ticket_types: Number(raw.total_ticket_types) || 0,
    tables: Array.isArray(raw.tables)
      ? (raw.tables.map((row) =>
          normalizeTicketOrTableRow((row || {}) as Record<string, unknown>),
        ) as DateRow["tables"])
      : [],
    tickets: Array.isArray(raw.tickets)
      ? (raw.tickets.map((row) =>
          normalizeTicketOrTableRow((row || {}) as Record<string, unknown>),
        ) as DateRow["tickets"])
      : [],
    has_bookings: normalizeApiBoolean(raw.has_bookings),
    ...(status !== undefined && { status }),
    is_cancelled: isCancelledFlag ?? (cancelled || undefined),
    is_readonly: isReadonlyFlag ?? (cancelled || undefined),
    can_edit: canEditFlag ?? (cancelled ? false : undefined),
    date_action: dateAction,
    use_cancel_date_action: cancelled
      ? false
      : normalizeApiBoolean(raw.use_cancel_date_action),
    cancellation_request_pending: normalizeApiBoolean(
      raw.cancellation_request_pending,
    ),
    has_financial_bookings: normalizeApiBoolean(raw.has_financial_bookings),
    cancelled: cancelled || undefined,
    cancel_reason: cancelReason,
    ...(cancelledAt !== undefined && { cancelled_at: cancelledAt }),
  };
}

/** API may return `stepThree.rooms` as a name-keyed object or an array. */
export function normalizeVendorStepThreeRooms(
  raw: unknown,
): VendorStepThreeRoomEntry[] {
  if (!raw) return [];

  const toEntry = (payload: Record<string, unknown>): VendorStepThreeRoomEntry | null => {
    const roomId = Number(payload.room_id);
    if (!Number.isFinite(roomId) || roomId <= 0) return null;
    const datesRaw = Array.isArray(payload.dates) ? payload.dates : [];
    return {
      room_id: roomId,
      dates: datesRaw.map((d) =>
        normalizeVendorStepThreeDateRow((d || {}) as Record<string, unknown>),
      ),
    };
  };

  if (Array.isArray(raw)) {
    return raw
      .map((item) => toEntry((item || {}) as Record<string, unknown>))
      .filter((item): item is VendorStepThreeRoomEntry => item !== null);
  }

  if (typeof raw === "object") {
    return Object.values(raw as Record<string, Record<string, unknown>>)
      .map((payload) => toEntry(payload || {}))
      .filter((item): item is VendorStepThreeRoomEntry => item !== null);
  }

  return [];
}

/**
 * Align persisted step-three rooms with the active step-two room list.
 *
 * Prefer exact `room_id` matches. When ids diverge (common after duplicating an
 * event to another location that has different venue room ids), fall back to
 * room order / first unused dated entry so API dates are not wiped from the UI.
 */
export function syncStepThreeRoomsFromStepTwo(
  stepTwoRooms: Array<{ room_id?: number; name?: string }>,
  existing: VendorStepThreeRoomEntry[],
): VendorStepThreeRoomEntry[] {
  const usedExistingIndexes = new Set<number>();

  return stepTwoRooms
    .filter((room) => Number(room.room_id) > 0)
    .map((room, index) => {
      const roomId = Number(room.room_id);

      const byIdIndex = existing.findIndex(
        (entry, i) =>
          entry.room_id === roomId && !usedExistingIndexes.has(i),
      );
      if (byIdIndex >= 0) {
        usedExistingIndexes.add(byIdIndex);
        return {
          room_id: roomId,
          dates: existing[byIdIndex]?.dates?.length
            ? existing[byIdIndex].dates
            : [],
        };
      }

      // Same ordinal after a location duplicate — room ids differ, order matches.
      if (
        index < existing.length &&
        !usedExistingIndexes.has(index) &&
        existing[index]?.dates?.length
      ) {
        usedExistingIndexes.add(index);
        return {
          room_id: roomId,
          dates: existing[index].dates,
        };
      }

      const fallbackIndex = existing.findIndex(
        (entry, i) =>
          !usedExistingIndexes.has(i) && Boolean(entry.dates?.length),
      );
      if (fallbackIndex >= 0) {
        usedExistingIndexes.add(fallbackIndex);
        return {
          room_id: roomId,
          dates: existing[fallbackIndex].dates,
        };
      }

      return {
        room_id: roomId,
        dates: [],
      };
    });
}

export function findStepThreeDatesForRoom(
  rooms: VendorStepThreeRoomEntry[],
  roomId: number,
): StepThreeType["dates"] {
  const entry = rooms.find((room) => room.room_id === roomId);
  return entry?.dates?.length ? entry.dates : [];
}

function toSafeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Maps one form date row to the vendor step-3 API contract. */
export function formatVendorStepThreeDateForApi(
  date: DateRow,
): Record<string, unknown> {
  const bookingType = date.booking_type ?? "tickets";
  const cancelled = isVendorDateCancelled(date);
  const ticketsActive = bookingType === "tickets" || bookingType === "both";
  const tablesActive = bookingType === "tables" || bookingType === "both";
  // Form may keep a blank ticket/table row after unchecking that option.
  // Do not send those rows — Laravel still validates each item in the array.
  const tickets = ticketsActive ? (date.tickets ?? []) : [];
  const tables = tablesActive ? (date.tables ?? []) : [];
  const base: Record<string, unknown> = {
    ...(typeof date.id === "number" &&
      Number.isFinite(date.id) &&
      date.id > 0 && { id: date.id }),
    event_date: date.event_date,
    booking_type: bookingType,
    ...(cancelled && { cancelled: true }),
    ...(cancelled &&
      date.cancel_reason?.trim() && {
        cancel_reason: date.cancel_reason.trim(),
        cancellation_reason: date.cancel_reason.trim(),
      }),
    total_table_types: tablesActive
      ? (date.total_table_types ?? tables.length)
      : 0,
    tables,
    total_ticket_types: ticketsActive
      ? (date.total_ticket_types ?? tickets.length)
      : 0,
    tickets,
  };

  if (bookingType === "tickets") {
    return base;
  }

  const paymentType = date.payment_type ?? "full";
  base.payment_type = paymentType;

  if (paymentType === "deposit") {
    let depositDueDate = "";
    if (date.deposit_due_date) {
      try {
        depositDueDate =
          typeof date.deposit_due_date === "string"
            ? date.deposit_due_date
            : new Date(date.deposit_due_date).toISOString().split("T")[0];
      } catch {
        depositDueDate = "";
      }
    }
    return {
      ...base,
      deposit_type: date.deposit_type || "amount",
      deposit_value: toSafeNumber(date.deposit_value),
      deposit_due_date: depositDueDate,
    };
  }

  return {
    ...base,
    is_deposit_enabled: false,
    deposit_due_date: "",
  };
}

/** Preserve API identity + cancel/remove flags across form clean passes. */
function pickDateActionMeta(date: DateRow): Partial<DateRow> {
  const dateAction = parseDateAction(date.date_action);
  const id =
    typeof date.id === "number" && Number.isFinite(date.id) && date.id > 0
      ? date.id
      : undefined;

  return {
    ...(id !== undefined && { id }),
    ...(date.has_bookings !== undefined && { has_bookings: date.has_bookings }),
    ...(date.status !== undefined && { status: date.status }),
    ...(date.is_cancelled !== undefined && { is_cancelled: date.is_cancelled }),
    ...(date.is_readonly !== undefined && { is_readonly: date.is_readonly }),
    ...(date.can_edit !== undefined && { can_edit: date.can_edit }),
    ...(dateAction !== undefined && { date_action: dateAction }),
    ...(date.use_cancel_date_action !== undefined && {
      use_cancel_date_action: date.use_cancel_date_action,
    }),
    ...(date.cancellation_request_pending !== undefined && {
      cancellation_request_pending: date.cancellation_request_pending,
    }),
    ...(date.has_financial_bookings !== undefined && {
      has_financial_bookings: date.has_financial_bookings,
    }),
    ...(date.cancelled !== undefined && { cancelled: date.cancelled }),
    ...(date.cancel_reason !== undefined && {
      cancel_reason: date.cancel_reason,
    }),
    ...(date.cancelled_at !== undefined && {
      cancelled_at: date.cancelled_at,
    }),
  };
}

export function cleanVendorStepThreeDatesForForm(
  dates: StepThreeType["dates"] | undefined,
): StepThreeType["dates"] {
  if (!dates?.length) {
    return [];
  }

  return dates.map((date) => {
    const actionMeta = pickDateActionMeta(date);

    if (date.booking_type === "tickets") {
      return {
        ...date,
        ...actionMeta,
        event_date: date.event_date,
        booking_type: date.booking_type,
        total_ticket_types:
          Number(date.total_ticket_types) || (date.tickets?.length ?? 0),
        tickets: date.tickets ?? [],
        total_table_types:
          Number(date.total_table_types) || (date.tables?.length ?? 0),
        tables: date.tables ?? [],
      };
    }

    if (date.payment_type === "full" || !date.payment_type) {
      return {
        ...date,
        ...actionMeta,
        payment_type: "full" as const,
        is_deposit_enabled: false,
        deposit_type: undefined,
        deposit_value: undefined,
        deposit_due_date: "",
      };
    }

    return {
      ...date,
      ...actionMeta,
      is_deposit_enabled: true,
    };
  });
}
