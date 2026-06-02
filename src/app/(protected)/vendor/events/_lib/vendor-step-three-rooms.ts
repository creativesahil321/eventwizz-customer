import type { StepThreeType } from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";

export type VendorStepThreeRoomEntry = {
  room_id: number;
  dates: StepThreeType["dates"];
};

type DateRow = StepThreeType["dates"][number];

const hasNonEmpty = (value: unknown): boolean =>
  String(value ?? "").trim().length > 0;

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

function normalizeTicketOrTableRow<T extends Record<string, unknown>>(
  raw: T,
): T {
  const status = normalizeApiBoolean(raw.status);
  return {
    ...raw,
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

  return {
    ...(typeof raw.id === "number" && Number.isFinite(raw.id) ? { id: raw.id } : {}),
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
    use_cancel_date_action: normalizeApiBoolean(raw.use_cancel_date_action),
    cancellation_request_pending: normalizeApiBoolean(
      raw.cancellation_request_pending,
    ),
    has_financial_bookings: normalizeApiBoolean(raw.has_financial_bookings),
    cancelled: normalizeApiBoolean(raw.cancelled),
    cancel_reason: String(
      raw.cancel_reason ?? raw.cancellation_reason ?? "",
    ).trim(),
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

/** Align persisted step-three rooms with the active step-two room list. */
export function syncStepThreeRoomsFromStepTwo(
  stepTwoRooms: Array<{ room_id?: number; name?: string }>,
  existing: VendorStepThreeRoomEntry[],
): VendorStepThreeRoomEntry[] {
  return stepTwoRooms
    .filter((room) => Number(room.room_id) > 0)
    .map((room) => {
      const roomId = Number(room.room_id);
      const found = existing.find((entry) => entry.room_id === roomId);
      return {
        room_id: roomId,
        dates: found?.dates?.length ? found.dates : [],
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
  const base: Record<string, unknown> = {
    ...(typeof date.id === "number" &&
      Number.isFinite(date.id) &&
      date.id > 0 && { id: date.id }),
    event_date: date.event_date,
    booking_type: bookingType,
    ...(date.cancelled === true && { cancelled: true }),
    ...(date.cancelled === true &&
      date.cancel_reason?.trim() && {
        cancel_reason: date.cancel_reason.trim(),
        cancellation_reason: date.cancel_reason.trim(),
      }),
    total_table_types:
      bookingType !== "tickets"
        ? date.total_table_types ?? (date.tables?.length ?? 0)
        : 0,
    tables: bookingType !== "tickets" ? (date.tables ?? []) : [],
    total_ticket_types:
      bookingType !== "tables"
        ? date.total_ticket_types ?? (date.tickets?.length ?? 0)
        : 0,
    tickets: bookingType !== "tables" ? (date.tickets ?? []) : [],
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

export function cleanVendorStepThreeDatesForForm(
  dates: StepThreeType["dates"] | undefined,
): StepThreeType["dates"] {
  if (!dates?.length) {
    return [];
  }

  return dates.map((date) => {
    if (date.booking_type === "tickets") {
      return {
        event_date: date.event_date,
        booking_type: date.booking_type,
        total_ticket_types: date.total_ticket_types ?? 0,
        tickets: date.tickets ?? [],
        total_table_types: 0,
        tables: [],
      };
    }

    if (date.payment_type === "full" || !date.payment_type) {
      return {
        ...date,
        payment_type: "full" as const,
        is_deposit_enabled: false,
        deposit_type: undefined,
        deposit_value: undefined,
        deposit_due_date: "",
      };
    }

    return {
      ...date,
      is_deposit_enabled: true,
    };
  });
}
