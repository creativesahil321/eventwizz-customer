import * as z from "zod";
import {
  BANNER_HEADING_MAX_WORDS,
  countWords,
} from "@/lib/word-count";

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

//=== Step 1 ===//
export const stepOneSchema = z
  .object({
    step: z.literal(1),
    vendor_location_id: z.number().optional(),
    event_id: z.number().optional(), // Added event_id to support editing existing events
    event_category_id: z.number().min(1, "Event Category is required"),
    event_name: z
      .string()
      .min(1, "Event name is required")
      .max(40, "Event name must not exceed 40 characters"),
    remove_event_banner_image: z.boolean().optional(),
    remove_event_banner_video: z.boolean().optional(),
    event_banner_video: z.any().optional(),
    event_banner_image: z.any().optional(),
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
      .min(1, "Banner sub heading is required")
      .max(80, "Banner sub heading must not exceed 80 characters"),
    about_event_heading: z
      .string()
      .min(1, "About event heading is required")
      .max(50, "About event heading must not exceed 50 characters"),
    about_event_sub_heading: z
      .string()
      .min(1, "About event sub heading is required")
      .max(80, "About event sub heading must not exceed 80 characters"),
    about_event_description: z
      .string()
      .min(1, "About event description is required"),
    event_schedular_title: z
      .string()
      .min(1, "Event schedular title is required")
      .max(40, "Event schedular title must not exceed 40 characters"),
    event_schedular_background_image: z
      .union([z.instanceof(File), z.string().url(), z.null()])
      .nullable()
      .optional(),
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
    package_image: z
      .union([z.instanceof(File), z.string().url(), z.null()])
      .nullable()
      .optional(),
    package_title: z
      .string()
      .min(1, "Event main heading is required")
      .max(40, "Event main heading must not exceed 40 characters"),
    package_description: z.string().min(1, "Event sub-heading is required"),
    package_button_name: z
      .string()
      .min(1, "Button name is required")
      .max(18, "Button name must not exceed 18 characters"),
    package_details: z
      .array(
        z.object({
          title: z
            .string()
            .min(1, "Title is required")
            .max(40, "Package detail title must not exceed 40 characters"),
        })
      )
      .min(1, "At least one package detail is required"),
    gallery: z
      .array(
        z.union([
          z.instanceof(File),
          z.object({ id: z.number(), url: z.string().url() }),
        ])
      )
      .optional(),
  })
  .refine(
    (data) => {
      // Check if package_image exists (either as File or URL string)
      const hasImage =
        data.package_image &&
        (data.package_image instanceof File ||
          (typeof data.package_image === "string" &&
            data.package_image.length > 0));
      return hasImage;
    },
    {
      message: "Package image is required",
      path: ["package_image"],
    }
  );
export type StepTwoType = z.infer<typeof stepTwoSchema>;

//=== Step 3 ===//
const validateDepositDueDate = (data: unknown) => {
  const { booking_type, payment_type, deposit_due_date, is_deposit_enabled } =
    data as {
      booking_type: string;
      payment_type: string;
      deposit_due_date?: string;
      is_deposit_enabled?: boolean;
    };
  // Only validate payment fields for tables/both booking types
  if (booking_type === "tickets") {
    return true;
  }

  if (is_deposit_enabled === false) {
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

const normalizeBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(trimmed)) return true;
    if (["false", "0", "no", "off", ""].includes(trimmed)) return false;
  }
  return undefined;
};

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
  id: z.number().optional(),
  event_date: z.string().min(1, "Date is required"),
  booking_type: z.enum(["tickets", "tables", "both"]),
  has_bookings: z.boolean().optional(),
  /** From GET show — prefer over has_bookings for cancel vs remove */
  use_cancel_date_action: z.boolean().optional(),
  cancellation_request_pending: z.boolean().optional(),
  has_financial_bookings: z.boolean().optional(),
  cancelled: z.boolean().optional(),
  cancel_reason: z.string().optional(),
  payment_type: z.enum(["deposit", "full"]).optional(),
  is_deposit_enabled: z.preprocess(normalizeBoolean, z.boolean().optional()),
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
    tickets: z
      .array(
        z
          .object({
            id: z.number().optional(), // From API when editing
            event_date_id: z.number().optional(), // From API when editing
            title: z
              .string()
              .min(1, "Title is required")
              .max(25, "Ticket title must not exceed 25 characters"),
            description: z
              .string()
              .min(1, "Description is required")
              .max(160, "Ticket description must not exceed 160 characters"),
            total_capacity: z.union([z.string(), z.number()]).refine((val) => {
              const num = typeof val === "string" ? parseInt(val, 10) : val;
              return !isNaN(num) && num >= 1 && num <= 100000;
            }, "Total capacity must be between 1 and 100,000"),
            price: z.union([z.string(), z.number()]).refine((val) => {
              const num = typeof val === "string" ? parseInt(val, 10) : val;
              return !isNaN(num) && num >= 1 && num <= 9999;
            }, "Price must be between 1 and 9,999 (4 digits max)"),
            sold_tickets: z.number().optional(), // Read-only from API
            status: z.boolean().optional(), // Read-only from API
          })
          .superRefine((ticket, ctx) => {
            // Validate that total_capacity is not less than sold_tickets
            if (
              ticket.sold_tickets !== undefined &&
              ticket.sold_tickets !== null
            ) {
              const totalCapacity =
                typeof ticket.total_capacity === "string"
                  ? parseInt(ticket.total_capacity, 10)
                  : ticket.total_capacity;

              if (
                !isNaN(totalCapacity) &&
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
    total_ticket_types: z.number().optional(),
    tables: z
      .array(
        z
          .object({
            id: z.number().optional(), // From API when editing
            event_date_id: z.number().optional(), // From API when editing
            min_persons: z.union([z.string(), z.number()]).refine((val) => {
              const num = typeof val === "string" ? parseInt(val, 10) : val;
              return !isNaN(num) && num >= 1;
            }, "Minimum persons must be at least 1"),
            max_persons: z.union([z.string(), z.number()]).refine((val) => {
              const num = typeof val === "string" ? parseInt(val, 10) : val;
              return !isNaN(num) && num >= 1;
            }, "Maximum persons must be at least 1"),
            price: z.union([z.string(), z.number()]).refine((val) => {
              const num = typeof val === "string" ? parseInt(val, 10) : val;
              return !isNaN(num) && num >= 0 && num <= 9999;
            }, "Price must be between 0 and 9,999 (4 digits max)"),
            total_tables: z.union([z.string(), z.number()]).refine((val) => {
              const num = typeof val === "string" ? parseInt(val, 10) : val;
              return !isNaN(num) && num >= 1 && num <= 5000;
            }, "Total tables must be between 1 and 5,000"),
            sold_tables: z.number().optional(), // Read-only from API
            status: z.boolean().optional(), // Read-only from API
          })
          .superRefine((table, ctx) => {
            // Validate that total_tables is not less than sold_tables
            if (table.sold_tables !== undefined && table.sold_tables !== null) {
              const totalTables =
                typeof table.total_tables === "string"
                  ? parseInt(table.total_tables, 10)
                  : table.total_tables;

              if (!isNaN(totalTables) && totalTables < table.sold_tables) {
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
    total_table_types: z.number().optional(),
  })
  .refine(validateDepositDueDate, depositDueDateMessage)
  .superRefine((data, ctx) => {
    // Only validate deposit fields for tables/both when deposit is selected
    if (!["tables", "both"].includes(data.booking_type)) {
      return;
    }

    if (data.is_deposit_enabled === false) {
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

    // Validate that deposit due date is before event date
    // Only validate if payment type is deposit or deposit is enabled
    if (
      data.payment_type === "deposit" &&
      data.is_deposit_enabled &&
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
      if (["tickets", "both"].includes(data.booking_type)) {
        return Array.isArray(data.tickets) && data.tickets.length > 0;
      }
      return true;
    },
    { message: "At least one ticket is required", path: ["tickets"] }
  )
  .refine(
    (data) => {
      if (["tables", "both"].includes(data.booking_type)) {
        return Array.isArray(data.tables) && data.tables.length > 0;
      }
      return true;
    },
    { message: "At least one table is required", path: ["tables"] }
  );

export const stepThreeSchema = z
  .object({
    step: z.literal(3),
    event_id: z.number().min(1, "Event ID is required"),
    /** Sent on save; may be filled from step 1 if omitted */
    vendor_location_id: z.number().min(1).optional(),
    dates: z.array(dateSchema),
  })
  .superRefine((data, ctx) => {
    const dates = data.dates;
    if (!dates || dates.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    for (let i = 0; i < dates.length; i++) {
      const d = dates[i].event_date;
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const eventTime = new Date(d + "T00:00:00").getTime();
        if (eventTime < todayTime) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Event date must be today or in the future.",
            path: ["dates", i, "event_date"],
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
          path: ["dates", i, "event_date"],
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
          path: ["dates"],
        });
        return;
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
export const stepFourSchema = z
  .object({
    step: z.literal(4),
    event_id: z.number().min(1, "Event ID is required"),
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
    menus: z
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
                  .max(160, "Description must not exceed 160 characters")
                  .optional(),
              })
            )
            .min(1, "At least one item is required")
            .max(10, "Maximum of 10 items allowed per category"),
        })
      )
      .optional(),
    menu_background_image: z
      .union([z.instanceof(File), z.string().url(), z.null()])
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.catering_option === 1) {
      if (!data.menu_title || data.menu_title.trim() === "")
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Menu title is required when catering option is Yes",
          path: ["menu_title"],
        });
      if (!data.menu_description || data.menu_description.trim() === "")
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Menu description is required when catering option is Yes",
          path: ["menu_description"],
        });
      if (!data.event_menu_category_id || data.event_menu_category_id < 1)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Menu category is required when catering option is Yes",
          path: ["event_menu_category_id"],
        });
      if (!data.menus || data.menus.length === 0)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one menu is required when catering option is Yes",
          path: ["menus"],
        });
    }
  });
export type StepFourType = z.infer<typeof stepFourSchema>;

//=== Step 5 ===//
export const stepFiveSchema = z.object({
  step: z.literal(5),
  event_id: z.number(),
  drink_title: z
    .string()
    .min(1, "The drink title field is required")
    .max(40, "Drink title must not exceed 40 characters"),
  drink_description: z
    .string()
    .min(1, "The drink description field is required")
    .max(160, "Drink description must not exceed 160 characters"),
  packages: z
    .array(
      z.object({
        id: z.number().optional(), // Optional for backward compatibility (required when from API)
        title: z
          .string()
          .min(1, "Package title is required")
          .max(25, "Package title must not exceed 25 characters"),
        description: z
          .string()
          .min(1, "Package description is required")
          .max(160, "Package description must not exceed 160 characters"),
        price: z.union([z.number(), z.string()]).refine(
          (val) => {
            // Check if value is empty, null, or undefined
            if (val === "" || val === null || val === undefined) {
              return false;
            }
            const num = typeof val === "string" ? Number.parseFloat(val) : val;
            return !Number.isNaN(num) && num > 0 && num <= 999999;
          },
          {
            message:
              "Package price is required and must be between 1 and 999999",
          }
        ),
        available_quantity: z
          .union([z.number(), z.string()])
          .transform((val) => {
            if (typeof val === "string") {
              // Handle empty string from API - default to 100
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
          .refine((val) => val <= 500, {
            message: "Available quantity cannot exceed 500",
          }),
        sold_quantity: z.number().optional(), // Read-only from API
      })
    )
    .min(1, "At least one package is required"),
});
export type StepFiveType = z.infer<typeof stepFiveSchema>;

//=== Step 6 ===//
export const stepSixSchema = z
  .object({
    step: z.literal(6),
    event_id: z.number(),
    remove_brochure_pdf: z.boolean().optional(),
    remove_brochure_pdf_2: z.boolean().optional(),
    remove_faq_pdf: z.boolean().optional(),
    brochure_pdf: z
      .union([z.instanceof(File), z.string().url(), z.null()])
      .optional(),
    brochure_pdf_2: z
      .union([z.instanceof(File), z.string().url(), z.null()])
      .optional(),
    faq_pdf: z
      .union([z.instanceof(File), z.string().url(), z.null()])
      .optional(),
    event_address: z
      .string()
      .min(1, "Event address is required")
      .refine((val) => val.trim().length > 0, {
        message: "Event address is required",
      }),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    price_start_from: z
      .string()
      .min(1, "Starting price is required")
      .refine(
        (val) => {
          const num = Number(val);
          return !Number.isNaN(num) && num >= 0 && num <= 999999;
        },
        { message: "Price must be between 0 and 999999" }
      ),
    price_start_from_button_text: z
      .string()
      .max(18, "Button text must not exceed 18 characters")
      .optional()
      .default("Book Now"),
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
    }),
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
  })
  .superRefine((data, ctx) => {
    // Main brochure PDF is required
    if (!data.brochure_pdf && !data.remove_brochure_pdf) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Event Brochure PDF is required",
        path: ["brochure_pdf"],
      });
    }
  });
export type StepSixType = z.infer<typeof stepSixSchema>;

//=== Step 7 ===//
export const stepSevenSchema = z.object({
  step: z.literal(7),
  event_id: z.number(),
  faqs: z.array(
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
    city: z.string().optional(),
    address: z.string().optional(),
    contact_number: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.is_duplicate === true) {
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
    }
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
