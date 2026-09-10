import * as z from "zod";
import { coerceApiBoolean } from "@/lib/coerce-api-boolean";
import { STEP_NINE_MAX_FAQS } from "@/app/(on-boarding)/on-boarding/_components/form-provider/schema";
import {
  DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS,
  DRINK_PACKAGE_PRICE_MAX,
  DRINK_PACKAGE_QTY_MAX,
  DRINK_SECTION_DESCRIPTION_MAX_CHARS,
  DRINK_SECTION_TITLE_MAX_CHARS,
  EVENT_PACKAGE_MAIN_HEADING_MAX_CHARS,
  EVENT_PACKAGE_SUB_HEADING_MAX_CHARS,
  EVENT_ROOM_MAX_COUNT,
  EVENT_ROOM_MIN_COUNT,
  normalizeVendorStepTwoRooms,
  PACKAGE_DETAIL_LINE_MAX_CHARS,
} from "@/lib/event-form-limits";
import {
  plainTextCharCount,
  RICH_DESCRIPTION_MAX_CHARS,
} from "@/lib/plain-text-length";
import {
  BANNER_HEADING_MAX_WORDS,
  countWords,
} from "@/lib/word-count";
import { isVendorDateCancelled } from "@/app/(protected)/vendor/events/_lib/vendor-date-cancelled";

// Validation functions for event scheduler
// Removed future time validation - only keeping sequence validation
const validateTimeSequence = (
  schedules: Array<{ title: string; time: string }>
): boolean => {
  if (schedules.length <= 1) return true;

  const validSchedules = schedules.filter(
    (schedule) => schedule.time && schedule.title
  );
  if (validSchedules.length <= 1) return true;

  for (let i = 0; i < validSchedules.length - 1; i++) {
    const currentTime = validSchedules[i].time;
    const nextTime = validSchedules[i + 1].time;

    if (!currentTime || !nextTime) continue;

    const [currentHours, currentMinutes] = currentTime.split(":").map(Number);
    const [nextHours, nextMinutes] = nextTime.split(":").map(Number);

    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    const nextTotalMinutes = nextHours * 60 + nextMinutes;

    if (nextTotalMinutes <= currentTotalMinutes) {
      return false;
    }
  }

  return true;
};

/** Laravel may return `""` for optional media; Zod `.url()` treats that as invalid. */
const coerceEmptyMediaToNull = (val: unknown) =>
  val === "" || val === undefined ? null : val;

const persistedMediaSchema = z.preprocess(
  coerceEmptyMediaToNull,
  z.union([z.instanceof(File), z.string().url(), z.null()]).nullable().optional(),
);

const galleryEntrySchema = z.union([
  z.instanceof(File),
  z.object({ id: z.number(), url: z.string().url() }),
]);

const gallerySchema = z.preprocess((val) => {
  if (!Array.isArray(val)) return [];
  return val.filter((item) => {
    if (item instanceof File) return true;
    if (!item || typeof item !== "object") return false;
    const id = (item as { id?: unknown }).id;
    const url = String((item as { url?: unknown }).url ?? "").trim();
    if (typeof id !== "number" || !url) return false;
    try {
      z.string().url().parse(url);
      return true;
    } catch {
      return false;
    }
  });
}, z.array(galleryEntrySchema).optional());

//=== Step 1 ===//
export const stepOneSchema = z
  .object({
    step: z.literal(1),
    vendor_location_id: z.number().optional(),
    event_id: z.number().optional(), // Added event_id to support editing existing events
    event_category_id: z.number().min(1, "Event category is required"),
    event_name: z
      .string()
      .min(1, "Event name is required")
      .max(40, "Event name must not exceed 40 characters"),
    remove_event_banner_image: z.boolean().optional(),
    remove_event_banner_video: z.boolean().optional(),
    remove_about_event_image: z.boolean().optional(),
    event_banner_video: z.any().optional(),
    event_banner_image: z.any().optional(),
    about_event_image: z.any().optional(),
    event_banner_heading: z
      .string()
      .min(1, "Banner heading is required")
      .max(500, "Banner heading is too long")
      .refine(
        (s) => countWords(s) <= BANNER_HEADING_MAX_WORDS,
        `Banner heading must not exceed ${BANNER_HEADING_MAX_WORDS} words`,
      ),
    event_banner_sub_heading: z
      .string()
      .min(1, "Banner subheading is required")
      .max(80, "Banner subheading must not exceed 80 characters"),
    about_event_heading: z
      .string()
      .min(1, "About event heading is required")
      .max(50, "About event heading must not exceed 50 characters"),
    about_event_sub_heading: z
      .string()
      .min(1, "About event subtitle is required")
      .max(80, "About event subtitle must not exceed 80 characters"),
    about_event_description: z
      .string()
      .min(1, "About event description is required"),
    /** Sent on step 1 create/update so persistence returns `is_rooms` on GET. */
    is_rooms: z.union([z.literal(0), z.literal(1)]).optional(),
    event_address: z
      .string()
      .min(1, "Event address is required")
      .refine((value) => value.trim().length > 0, {
        message: "Event address is required",
      }),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    location: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
      })
      .optional(),

  })
  .superRefine((data, ctx) => {
    // Check if image/video were removed
    const imageRemoved = data.remove_event_banner_image === true;
    const videoRemoved = data.remove_event_banner_video === true;

    // Require either image OR video, but not both
    // Don't count removed images/videos as valid
    const hasImage =
      !imageRemoved &&
      data.event_banner_image &&
      (data.event_banner_image instanceof File ||
        (typeof data.event_banner_image === "string" &&
          data.event_banner_image.length > 0 &&
          data.event_banner_image !== "null" &&
          data.event_banner_image !== "undefined"));
    const hasVideo =
      !videoRemoved &&
      data.event_banner_video &&
      (data.event_banner_video instanceof File ||
        (typeof data.event_banner_video === "string" &&
          data.event_banner_video.length > 0 &&
          data.event_banner_video !== "null" &&
          data.event_banner_video !== "undefined"));

    if (!hasImage && !hasVideo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either a banner image or video is required",
        path: ["event_banner_image"],
      });
    }
  });
export type StepOneType = z.infer<typeof stepOneSchema>;

//=== Step 2 ===//
export const stepTwoSchema = z
  .object({
    step: z.literal(2),
    event_id: z.number().min(1, "Event ID is required"),
    is_rooms: z.union([z.literal(0), z.literal(1)]).optional(),
    active_room_index: z.number().int().min(0).optional(),
    rooms: z
      .array(
        z.object({
          room_id: z.number().optional(),
          name: z.string().optional(),
          package_image: persistedMediaSchema,
          package_title: z.string().optional(),
          package_description: z.string().optional(),
          package_button_link: z.string().optional(),
          package_details: z
            .array(
              z.object({
                title: z.string().optional(),
              })
            )
            .optional(),
          gallery: gallerySchema,
          event_schedular_title: z.string().optional(),
          event_schedule_subtitle: z.string().optional(),
          event_schedular_background_image: persistedMediaSchema,
          event_schedular: z
            .array(
              z.object({
                title: z.string().optional(),
                time: z.string().optional(),
              })
            )
            .optional(),
        })
      )
      .optional(),
    package_image: persistedMediaSchema,
    package_title: z
      .string()
      .min(1, "Event main heading is required")
      .max(
        EVENT_PACKAGE_MAIN_HEADING_MAX_CHARS,
        `Event main heading must not exceed ${EVENT_PACKAGE_MAIN_HEADING_MAX_CHARS} characters`
      ),
    package_description: z
      .string()
      .min(1, "Event sub-heading is required")
      .max(
        EVENT_PACKAGE_SUB_HEADING_MAX_CHARS,
        `Event sub-heading must not exceed ${EVENT_PACKAGE_SUB_HEADING_MAX_CHARS} characters`
      ),
    package_button_link: z.string().optional(),
    package_details: z
      .array(
        z.object({
          title: z
            .string()
            .min(1, "Title is required")
            .max(
              PACKAGE_DETAIL_LINE_MAX_CHARS,
              `Package detail title must not exceed ${PACKAGE_DETAIL_LINE_MAX_CHARS} characters`
            ),
        })
      )
      .min(1, "At least one package detail is required"),
    gallery: gallerySchema,

    event_schedular_title: z
      .string()
      .min(1, "Event schedule title is required")
      .max(40, "Event schedule title must not exceed 40 characters"),
    event_schedule_subtitle: z
      .string()
      .max(160, "Custom copy must not exceed 160 characters"),
    event_schedular_background_image: persistedMediaSchema,
    event_schedular: z
      .array(
        z.object({
          title: z
            .string()
            .min(1, "Title is required")
            .max(40, "Schedule title must not exceed 40 characters"),
          time: z
            .string()
            .min(1, "Time is required")
            .regex(
              /^([01]\d|2[0-3]):([0-5]\d)$/,
              "Time must be in HH:mm format"
            ),
        })
      )
      .min(1, "At least one schedule is required")
      .refine(validateTimeSequence, "Times must be in ascending order"),
    /** Venue room ids to detach when deselected in the Package tab room picker. */
    removed_room_ids: z.array(z.number().int().positive()).optional(),

  })
  .superRefine((data, ctx) => {
    if (data.is_rooms === 1) {
      const roomsCount = Array.isArray(data.rooms) ? data.rooms.length : 0;
      if (roomsCount < EVENT_ROOM_MIN_COUNT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `At least ${EVENT_ROOM_MIN_COUNT} rooms are required in room system mode.`,
          path: ["rooms"],
        });
      }
      if (roomsCount > EVENT_ROOM_MAX_COUNT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Maximum ${EVENT_ROOM_MAX_COUNT} rooms are allowed.`,
          path: ["rooms"],
        });
      }
    }
  })
  .refine(
    (data) => {
      const hasPackageImage = (image: unknown) =>
        !!image &&
        (image instanceof File ||
          (typeof image === "string" && image.length > 0));

      if (hasPackageImage(data.package_image)) return true;

      if (data.is_rooms === 1) {
        const rooms = normalizeVendorStepTwoRooms(data.rooms);
        const idx =
          typeof data.active_room_index === "number" && data.active_room_index >= 0
            ? Math.min(data.active_room_index, Math.max(rooms.length - 1, 0))
            : 0;
        return hasPackageImage(rooms[idx]?.package_image);
      }

      return false;
    },
    {
      message: "Package image is required",
      path: ["package_image"],
    }
  )


export type StepTwoType = z.infer<typeof stepTwoSchema>;

//=== Step 3 ===//
const validateDepositDueDate = (data: unknown) => {
  if (isVendorDateCancelled(data as { cancelled?: boolean })) {
    return true;
  }
  const { booking_type, payment_type, deposit_due_date } = data as {
    booking_type: string;
    payment_type: string;
    deposit_due_date?: string;
  };
  if (booking_type === "tickets") {
    return true;
  }

  return (
    payment_type !== "deposit" ||
    !!(deposit_due_date && deposit_due_date.trim())
  );
};
const depositDueDateMessage = {
  message: "Balance due date is required when deposit payment is selected",
  path: ["deposit_due_date"],
};

const normalizeBoolean = (value: unknown) => coerceApiBoolean(value);

/** Laravel / RHF often provide numeric IDs and counts as strings. */
const coerceFiniteNumber = (value: unknown): number | undefined => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : undefined;
};

const optionalCoercedFiniteNumber = z.preprocess(
  coerceFiniteNumber,
  z.number().optional(),
);

const requiredCoercedFiniteNumber = (message: string) =>
  z.preprocess(
    (value) => coerceFiniteNumber(value) ?? NaN,
    z.number().min(1, message),
  );

/** Laravel often returns 0/1 for boolean columns on persisted rows. */
const optionalBooleanFromApi = z.preprocess(
  normalizeBoolean,
  z.boolean().optional(),
);

const normalizeDepositType = (value: unknown) => {
  if (typeof value !== "string") return undefined;

  const lower = value.toLowerCase();
  if (lower === "amount" || lower === "percentage") {
    return lower;
  }

  // Coerce legacy or invalid values to amount
  return "amount";
};

const baseDateSchema = z.object({
  /** Existing `event_dates.id` — send on update */
  id: optionalCoercedFiniteNumber,
  event_date: z.string().min(1, "Date is required"),
  booking_type: z.enum(["tickets", "tables", "both"]),
  has_bookings: optionalBooleanFromApi,
  /** 1 = active, 2 = cancelled, 0 = inactive */
  status: optionalCoercedFiniteNumber,
  is_cancelled: optionalBooleanFromApi,
  is_readonly: optionalBooleanFromApi,
  can_edit: optionalBooleanFromApi,
  /**
   * From GET show — "cancel" | "remove" for actionable dates;
   * "cancelled" when the date is already cancelled (read-only).
   */
  date_action: z.enum(["cancel", "remove", "cancelled"]).optional(),
  /** From GET show — true when vendor must cancel (not hard-delete) the date */
  use_cancel_date_action: optionalBooleanFromApi,
  /** Legacy — ignore for cancel vs remove gating */
  cancellation_request_pending: optionalBooleanFromApi,
  has_financial_bookings: optionalBooleanFromApi,
  cancelled: optionalBooleanFromApi,
  cancel_reason: z.string().optional(),
  cancelled_at: z.string().nullable().optional(),
  payment_type: z.enum(["deposit", "full"]).optional(),
  is_deposit_enabled: optionalBooleanFromApi,
  deposit_type: z.preprocess(
    normalizeDepositType,
    z.enum(["amount", "percentage"]).optional()
  ),
  deposit_value: z
    .union([z.string(), z.number()])
    .refine((val) => {
      if (val === "" || val === null || val === undefined) return true;
      const num = typeof val === "string" ? parseFloat(val) : val;
      return !isNaN(num) && num >= 0;
    }, "Deposit value must be 0 or greater")
    .optional(),
  deposit_due_date: z.string().optional(),
});

const dateSchema = baseDateSchema
  .extend({
    // Ticket/table rows may be preserved while that option is unchecked.
    // Strict field rules run in superRefine only when booking_type includes them.
    tickets: z
      .array(
        z
          .object({
            id: optionalCoercedFiniteNumber,
            event_date_id: optionalCoercedFiniteNumber,
            title: z
              .string()
              .max(25, "Ticket title must not exceed 25 characters"),
            description: z
              .string()
              .max(160, "Ticket description must not exceed 160 characters"),
            total_capacity: z.union([z.string(), z.number()]),
            price: z.union([z.string(), z.number()]),
            sold_tickets: optionalCoercedFiniteNumber,
            status: optionalBooleanFromApi,
          })
          .superRefine((ticket, ctx) => {
            if (
              ticket.sold_tickets !== undefined &&
              ticket.sold_tickets !== null
            ) {
              const totalCapacity =
                typeof ticket.total_capacity === "string"
                  ? parseInt(ticket.total_capacity, 10)
                  : Number(ticket.total_capacity);

              if (
                Number.isFinite(totalCapacity) &&
                !Number.isNaN(totalCapacity) &&
                totalCapacity < ticket.sold_tickets
              ) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Total capacity cannot be less than sold tickets (${ticket.sold_tickets})`,
                  path: ["total_capacity"],
                });
              }
            }
          })
      )
      .optional(),
    total_ticket_types: optionalCoercedFiniteNumber,
    tables: z
      .array(
        z
          .object({
            id: optionalCoercedFiniteNumber,
            event_date_id: optionalCoercedFiniteNumber,
            min_persons: z.union([z.string(), z.number()]),
            max_persons: z.union([z.string(), z.number()]),
            price: z.union([z.string(), z.number()]),
            total_tables: z.union([z.string(), z.number()]),
            sold_tables: optionalCoercedFiniteNumber,
            status: optionalBooleanFromApi,
          })
          .superRefine((table, ctx) => {
            if (table.sold_tables !== undefined && table.sold_tables !== null) {
              const totalTables =
                typeof table.total_tables === "string"
                  ? parseInt(table.total_tables, 10)
                  : Number(table.total_tables);

              if (
                Number.isFinite(totalTables) &&
                !Number.isNaN(totalTables) &&
                totalTables < table.sold_tables
              ) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Total tables cannot be less than sold tables (${table.sold_tables})`,
                  path: ["total_tables"],
                });
              }
            }
          })
      )
      .optional(),
    total_table_types: optionalCoercedFiniteNumber,
  })
  .refine(validateDepositDueDate, depositDueDateMessage)
  .superRefine((data, ctx) => {
    if (isVendorDateCancelled(data)) return;

    const ticketsActive = ["tickets", "both"].includes(data.booking_type);
    const tablesActive = ["tables", "both"].includes(data.booking_type);

    if (ticketsActive) {
      (data.tickets ?? []).forEach((ticket, index) => {
        if (!String(ticket.title ?? "").trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Title is required",
            path: ["tickets", index, "title"],
          });
        }
        if (!String(ticket.description ?? "").trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Description is required",
            path: ["tickets", index, "description"],
          });
        }
        const capacity =
          typeof ticket.total_capacity === "string"
            ? parseInt(ticket.total_capacity, 10)
            : Number(ticket.total_capacity);
        if (
          ticket.total_capacity === "" ||
          ticket.total_capacity == null ||
          Number.isNaN(capacity) ||
          capacity < 1 ||
          capacity > 100000
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Total capacity must be between 1 and 100,000",
            path: ["tickets", index, "total_capacity"],
          });
        }
        const price =
          typeof ticket.price === "string"
            ? parseInt(ticket.price, 10)
            : Number(ticket.price);
        if (
          ticket.price === "" ||
          ticket.price == null ||
          Number.isNaN(price) ||
          price < 1 ||
          price > 9999
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Price must be between 1 and 9,999 (4 digits max)",
            path: ["tickets", index, "price"],
          });
        }
      });
    }

    if (tablesActive) {
      (data.tables ?? []).forEach((table, index) => {
        const minPersons =
          typeof table.min_persons === "string"
            ? parseInt(table.min_persons, 10)
            : Number(table.min_persons);
        if (
          table.min_persons === "" ||
          table.min_persons == null ||
          Number.isNaN(minPersons) ||
          minPersons < 1
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Minimum persons must be at least 1",
            path: ["tables", index, "min_persons"],
          });
        }
        const maxPersons =
          typeof table.max_persons === "string"
            ? parseInt(table.max_persons, 10)
            : Number(table.max_persons);
        if (
          table.max_persons === "" ||
          table.max_persons == null ||
          Number.isNaN(maxPersons) ||
          maxPersons < 1
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Maximum persons must be at least 1",
            path: ["tables", index, "max_persons"],
          });
        }
        const price =
          typeof table.price === "string"
            ? parseInt(table.price, 10)
            : Number(table.price);
        if (
          table.price === "" ||
          table.price == null ||
          Number.isNaN(price) ||
          price < 0 ||
          price > 9999
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Price must be between 0 and 9,999 (4 digits max)",
            path: ["tables", index, "price"],
          });
        }
        const totalTables =
          typeof table.total_tables === "string"
            ? parseInt(table.total_tables, 10)
            : Number(table.total_tables);
        if (
          table.total_tables === "" ||
          table.total_tables == null ||
          Number.isNaN(totalTables) ||
          totalTables < 1 ||
          totalTables > 5000
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Total tables must be between 1 and 5,000",
            path: ["tables", index, "total_tables"],
          });
        }
      });
    }

    // Only validate deposit fields for tables/both when deposit is selected
    if (!tablesActive) {
      return;
    }

    if (data.payment_type !== "deposit") {
      return;
    }

    // Deposit type must be chosen
    if (!data.deposit_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deposit type is required when deposit payment is selected",
        path: ["deposit_type"],
      });
    }

    const rawValue = data.deposit_value;
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deposit value is required when deposit payment is selected",
        path: ["deposit_value"],
      });
      return;
    }

    // Convert to integer (no decimals allowed)
    const value =
      typeof rawValue === "string"
        ? parseInt(rawValue, 10)
        : Math.floor(Number(rawValue));

    if (Number.isNaN(value) || value <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deposit value must be greater than 0",
        path: ["deposit_value"],
      });
      return;
    }

    if (data.deposit_type === "percentage") {
      if (value < 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Deposit percentage must be at least 20%",
          path: ["deposit_value"],
        });
      } else if (value > 80) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Deposit percentage cannot exceed 80%",
          path: ["deposit_value"],
        });
      }
    }

    // For Fixed Amount: deposit must be between 20% and 80% of the lowest table price
    // Round to integers for validation and error messages
    if (
      data.deposit_type === "amount" &&
      data.tables &&
      data.tables.length > 0
    ) {
      const lowestTablePrice = Math.min(
        ...data.tables.map((table) => {
          const price =
            typeof table.price === "string"
              ? parseInt(table.price, 10)
              : Math.floor(Number(table.price));
          return isNaN(price) ? Infinity : price;
        })
      );

      if (lowestTablePrice !== Infinity) {
        // Round to integers for validation
        const minAllowed = Math.ceil((lowestTablePrice * 20) / 100);
        const maxAllowed = Math.floor((lowestTablePrice * 80) / 100);

        if (value < minAllowed || value > maxAllowed) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Deposit amount must be between 20% (${minAllowed}) and 80% (${maxAllowed}) of the lowest table price (${lowestTablePrice})`,
            path: ["deposit_value"],
          });
        }
      }
    }

    if (
      data.payment_type === "deposit" &&
      data.deposit_due_date &&
      data.event_date
    ) {
      const depositDate = new Date(data.deposit_due_date);
      const eventDate = new Date(data.event_date);

      // Reset time to compare only dates
      depositDate.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);

      if (depositDate >= eventDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Balance due date must be before the event date",
          path: ["deposit_due_date"],
        });
      }
    }
  })
  .refine(
    (data) => {
      if (isVendorDateCancelled(data)) return true;
      // Require payment_type for tables/both booking types
      if (data.booking_type === "tables" || data.booking_type === "both") {
        return (
          data.payment_type &&
          (data.payment_type === "full" || data.payment_type === "deposit")
        );
      }
      return true;
    },
    {
      message: "Payment type is required for table bookings",
      path: ["payment_type"],
    }
  )
  .refine(
    (data) => {
      if (isVendorDateCancelled(data)) return true;
      if (["tickets", "both"].includes(data.booking_type)) {
        return Array.isArray(data.tickets) && data.tickets.length > 0;
      }
      return true;
    },
    { message: "At least one ticket is required", path: ["tickets"] }
  )
  .refine(
    (data) => {
      if (isVendorDateCancelled(data)) return true;
      if (["tables", "both"].includes(data.booking_type)) {
        return Array.isArray(data.tables) && data.tables.length > 0;
      }
      return true;
    },
    { message: "At least one table is required", path: ["tables"] }
  );

/** Persisted per-room snapshots — validated via top-level `dates` while editing. */
const stepThreeRoomEntrySchema = z.object({
  room_id: requiredCoercedFiniteNumber("Room ID is required"),
  dates: z.array(z.record(z.string(), z.unknown())),
});

export const stepThreeSchema = z
  .object({
    step: z.literal(3),
    event_id: requiredCoercedFiniteNumber("Event ID is required"),
    /** Sent on save; may be filled from step 1 if omitted */
    vendor_location_id: z.preprocess(
      coerceFiniteNumber,
      z.number().min(1).optional(),
    ),
    is_rooms: z.union([z.literal(0), z.literal(1)]).optional(),
    /** Active room (room mode) or single-venue dates */
    dates: z.array(dateSchema).default([]),
    /** Persisted per-room snapshots; sent on save when `is_rooms === 1` */
    rooms: z.array(stepThreeRoomEntrySchema).optional(),
  })
  .superRefine((data, ctx) => {
    // Room mode: only validate the active editor (`dates`), not every stored room slot.
    const dateLists = [{ dates: data.dates, pathPrefix: ["dates"] as const }];

    for (const { dates, pathPrefix } of dateLists) {
      if (!dates || dates.length === 0) continue;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTime = today.getTime();
      for (let i = 0; i < dates.length; i++) {
        if (isVendorDateCancelled(dates[i])) continue;
        const d = dates[i].event_date;
        if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
          const eventTime = new Date(d + "T00:00:00").getTime();
          if (eventTime < todayTime) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Event date must be today or in the future.",
              path: [...pathPrefix, i, "event_date"],
            });
          }
        }
      }
      const eventDates = dates.map((d) => d.event_date).filter(Boolean);
      const seen = new Set<string>();
      for (let i = 0; i < eventDates.length; i++) {
        if (seen.has(eventDates[i])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicate event dates are not allowed. Each date must be unique.",
            path: [...pathPrefix, i, "event_date"],
          });
          return;
        }
        seen.add(eventDates[i]);
      }
      for (let i = 0; i < eventDates.length - 1; i++) {
        const a = new Date(eventDates[i] + "T00:00:00").getTime();
        const b = new Date(eventDates[i + 1] + "T00:00:00").getTime();
        if (!Number.isNaN(a) && !Number.isNaN(b) && b <= a) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Dates must be in chronological ascending order.",
            path: [...pathPrefix],
          });
          return;
        }
      }
    }
  });
export type StepThreeType = z.infer<typeof stepThreeSchema>;

export const getDefaultDate = (
  bookingType: "tickets" | "tables" | "both" = "tickets"
): StepThreeType["dates"][number] => {
  const base = {
    event_date: "",
    booking_type: bookingType,
  };

  switch (bookingType) {
    case "tickets":
      return {
        ...base,
        tickets: [
          { title: "", description: "", total_capacity: "", price: "" },
        ],
        total_ticket_types: 1,
        tables: [],
        total_table_types: 0,
      };
    case "tables":
      return {
        ...base,
        payment_type: "full" as const,
        is_deposit_enabled: true,
        deposit_type: "amount" as const,
        deposit_value: "",
        deposit_due_date: "",
        tickets: [],
        total_ticket_types: 0,
        tables: [
          { min_persons: "", max_persons: "", price: "", total_tables: "" },
        ],
        total_table_types: 1,
      };
    case "both":
      return {
        ...base,
        payment_type: "full" as const,
        is_deposit_enabled: true,
        deposit_type: "amount" as const,
        deposit_value: "",
        deposit_due_date: "",
        tickets: [
          { title: "", description: "", total_capacity: "", price: "" },
        ],
        total_ticket_types: 1,
        tables: [
          { min_persons: "", max_persons: "", price: "", total_tables: "" },
        ],
        total_table_types: 1,
      };
  }
};

//=== Step 4 ===//
const stepFourMenusSchema = z
  .array(
    z.object({
      name: z
        .string()
        .min(1, "Category name is required")
        .max(40, "Category name must not exceed 40 characters"),
      items: z
        .array(
          z.object({
            title: z
              .string()
              .min(1, "Title is required")
              .max(40, "Item title must not exceed 40 characters"),
            description: z
              .string()
              .min(1, "Description is required")
              .max(
                RICH_DESCRIPTION_MAX_CHARS,
                `Item description must not exceed ${RICH_DESCRIPTION_MAX_CHARS} characters`
              ),
          })
        )
        .min(1, "At least one item is required")
        .max(10, "Maximum of 10 items allowed per category"),
    })
  )
  .optional();

/** Persisted per-room snapshots — validated via top-level fields while editing. */
const stepFourRoomEntrySchema = z.object({
  room_id: z.number().min(1),
  catering_option: z.number().min(0).max(1).optional(),
  menu_title: z.string().optional(),
  menu_description: z.string().optional(),
  event_menu_category_id: z.number().optional(),
  menus: z.array(z.record(z.string(), z.unknown())).optional(),
  menu_background_image: z
    .union([z.instanceof(File), z.string().url(), z.null()])
    .nullable()
    .optional(),
});

export const stepFourSchema = z
  .object({
    step: z.literal(4),
    event_id: z.number().min(1, "Event ID is required"),
    is_rooms: z.union([z.literal(0), z.literal(1)]).optional(),
    catering_option: z.number().min(0).max(1),
    menu_title: z
      .string()
      .max(40, "Menu title must not exceed 40 characters")
      .optional(),
    menu_description: z
      .string()
      .max(160, "Menu description must not exceed 160 characters")
      .optional(),
    event_menu_category_id: z.number().optional(),
    menus: stepFourMenusSchema,
    menu_background_image: z
      .union([z.instanceof(File), z.string().url(), z.null()])
      .nullable()
      .optional(),
    /** Persisted per-room snapshots; sent on save when `is_rooms === 1` */
    rooms: z.array(stepFourRoomEntrySchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.catering_option === 1) {
      if (!data.menu_title || data.menu_title.trim() === "")
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Menu title is required when food choices are enabled",
          path: ["menu_title"],
        });
      if (!data.menu_description || data.menu_description.trim() === "")
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Menu description is required when food choices are enabled",
          path: ["menu_description"],
        });
      if (!data.event_menu_category_id || data.event_menu_category_id < 1)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Menu category is required when food choices are enabled",
          path: ["event_menu_category_id"],
        });
      if (!data.menus || data.menus.length === 0)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "At least one menu is required when food choices are enabled",
          path: ["menus"],
        });
    }
  });
export type StepFourType = z.infer<typeof stepFourSchema>;

const stepFiveRoomEntrySchema = z.object({
  room_id: z.number(),
  brochure_pdf: z
    .union([z.instanceof(File), z.string().url(), z.null()])
    .optional(),
  brochure_pdf_2: z
    .union([z.instanceof(File), z.string().url(), z.null()])
    .optional(),
  remove_brochure_pdf: z.boolean().optional(),
  remove_brochure_pdf_2: z.boolean().optional(),
});

//=== Step 5 ===//
export const stepFiveSchema = z
  .object({
    step: z.literal(5),
    event_id: z.number(),
    is_rooms: z.union([z.literal(0), z.literal(1)]).optional(),
    rooms: z.array(stepFiveRoomEntrySchema).optional(),
    remove_brochure_pdf: z.boolean().optional(),
    remove_brochure_pdf_2: z.boolean().optional(),
    brochure_pdf: z
      .union([z.instanceof(File), z.string().url(), z.null()])
      .optional(),
    brochure_pdf_2: z
      .union([z.instanceof(File), z.string().url(), z.null()])
      .optional(),
    // Legacy location fields remain readable for old persisted events.
    event_address: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    location: z.object({
      title: z
        .string()
        .max(40, "Location title must not exceed 40 characters")
        .optional(),
      description: z
        .string()
        .max(160, "Location description must not exceed 160 characters")
        .optional(),
      icon: z.string().optional(),
    }).optional(),
    price: z
      .object({
        title: z
          .string()
          .max(40, "Price title must not exceed 40 characters")
          .optional(),
        description: z
          .string()
          .max(160, "Price description must not exceed 160 characters")
          .optional(),
        link: z.string().optional(),
        icon: z.string().optional(),
        price_title: z
          .string()
          .max(40, "Price title must not exceed 40 characters")
          .optional(),
      })
      .optional(),
    downloads: z
      .array(
        z.object({
          id: z.number().optional(),
          title: z
            .string()
            .max(40, "Download title must not exceed 40 characters")
            .optional(),
          pdf: z.instanceof(File).nullable().optional(),
          download_link: z.array(z.string()).optional(),
        })
      )
      .optional(),
    more_info: z
      .array(
        z.object({
          id: z.number().optional(),
          title: z
            .string()
            .max(40, "More info title must not exceed 40 characters")
            .optional(),
          description: z
            .string()
            .max(160, "More info description must not exceed 160 characters")
            .optional(),
          button_text: z
            .string()
            .max(18, "Button text must not exceed 18 characters")
            .optional(),
          button_link: z.string().optional(),
        })
      )
      .optional(),
  });

export type StepFiveType = z.infer<typeof stepFiveSchema>;

const stepSixPackageSchema = z.object({
  id: z.number().optional(),
  title: z
    .string()
    .min(1, "Package title is required")
    .max(
      DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS,
      `Package title must not exceed ${DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS} characters`,
    ),
  description: z
    .string()
    .min(1, "Package description is required")
    .refine(
      (val) => plainTextCharCount(val) <= RICH_DESCRIPTION_MAX_CHARS,
      {
        message: `Package description must not exceed ${RICH_DESCRIPTION_MAX_CHARS} characters`,
      },
    ),
  price: z.union([z.number(), z.string()]).refine(
    (val) => {
      if (val === "" || val === null || val === undefined) {
        return false;
      }
      const num = typeof val === "string" ? Number.parseFloat(val) : val;
      return (
        !Number.isNaN(num) && num > 0 && num <= DRINK_PACKAGE_PRICE_MAX
      );
    },
    {
      message: `Package price is required and must be between 1 and ${DRINK_PACKAGE_PRICE_MAX}`,
    },
  ),
  available_quantity: z
    .union([z.number(), z.string()])
    .transform((val) => {
      if (typeof val === "string") {
        if (val.trim() === "") {
          return 100;
        }
        const num = Number.parseFloat(val);
        return Number.isNaN(num) ? 100 : num;
      }
      return val || 100;
    })
    .refine((val) => val >= 1, {
      message: "Available quantity must be at least 1",
    })
    .refine((val) => val <= DRINK_PACKAGE_QTY_MAX, {
      message: `Available quantity cannot exceed ${DRINK_PACKAGE_QTY_MAX}`,
    }),
  sold_quantity: z.number().optional(),
});

const stepSixRoomEntrySchema = z.object({
  room_id: z.number(),
  drink_title: z.string().optional(),
  drink_description: z.string().optional(),
  packages: z.array(stepSixPackageSchema).optional(),
});

//=== Step 6 ===//
export const stepSixSchema = z.object({
  step: z.literal(6),
  event_id: z.number(),
  is_rooms: z.union([z.literal(0), z.literal(1)]).optional(),
  rooms: z.array(stepSixRoomEntrySchema).optional(),
  drink_title: z
    .string()
    .min(1, "Package section title is required")
    .max(
      DRINK_SECTION_TITLE_MAX_CHARS,
      `Drink title must not exceed ${DRINK_SECTION_TITLE_MAX_CHARS} characters`,
    ),
  drink_description: z
    .string()
    .min(1, "Package section description is required")
    .max(
      DRINK_SECTION_DESCRIPTION_MAX_CHARS,
      `Drink description must not exceed ${DRINK_SECTION_DESCRIPTION_MAX_CHARS} characters`,
    ),
  packages: z
    .array(stepSixPackageSchema)
    .min(1, "At least one package is required"),
});
export type StepSixType = z.infer<typeof stepSixSchema>;

//=== Step 7 ===//
export const stepSevenSchema = z.object({
  step: z.literal(7),
  event_id: z.number(),
  faqs: z
    .array(
      z.object({
        id: z.number().optional(),
        question: z
          .string()
          .min(1, "Question is required")
          .max(160, "Question must not exceed 160 characters"),
        answer: z
          .string()
          .min(1, "Answer is required")
          .max(500, "Answer must not exceed 500 characters"),
      })
    )
    .max(
      STEP_NINE_MAX_FAQS,
      `You can add at most ${STEP_NINE_MAX_FAQS} FAQs`
    ),
  deleted_faq_ids: z.array(z.number()).optional(),
});
export type StepSevenType = z.infer<typeof stepSevenSchema>;

//=== Step 8 ===//
export const stepEightSchema = z
  .object({
    step: z.literal(8),
    event_id: z.number(),
    reminder_email_before_days: z.number().optional(),
    submit_type: z.enum(["draft", "active"]),
    is_duplicate: z.boolean(),
    duplicate_target_type: z.enum(["existing", "new"]).optional(),
    vendor_location_id: z.number().optional(),
    city: z.string().optional(),
    address: z.string().optional(),
    contact_number: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.is_duplicate !== true) {
      return;
    }

    if (data.duplicate_target_type === "existing") {
      if (!data.vendor_location_id || data.vendor_location_id < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select an existing location",
          path: ["vendor_location_id"],
        });
      }
      return;
    }

    if (!data.city?.trim())
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "City is required",
        path: ["city"],
      });
    if (!data.address?.trim())
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Address is required",
        path: ["address"],
      });
    if (!data.contact_number?.trim())
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Contact number is required",
        path: ["contact_number"],
      });
  });
export type StepEightType = z.infer<typeof stepEightSchema>;

//=== Final Event Schema ===//
export const eventSchema = z.object({
  currentStep: z.number().min(1).max(8),
  stepOne: stepOneSchema,
  stepTwo: stepTwoSchema,
  stepThree: stepThreeSchema,
  stepFour: stepFourSchema,
  stepFive: stepFiveSchema,
  stepSix: stepSixSchema,
  stepSeven: stepSevenSchema,
  stepEight: stepEightSchema,
});
export type EventSchemaType = z.infer<typeof eventSchema>;
