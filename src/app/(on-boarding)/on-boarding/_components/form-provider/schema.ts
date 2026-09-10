import * as z from "zod";
import {
  DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS,
  DRINK_PACKAGE_PRICE_MAX,
  DRINK_PACKAGE_QTY_MAX,
  DRINK_SECTION_DESCRIPTION_MAX_CHARS,
  DRINK_SECTION_TITLE_MAX_CHARS,
  EVENT_PACKAGE_MAIN_HEADING_MAX_CHARS,
  EVENT_PACKAGE_SUB_HEADING_MAX_CHARS,
  PACKAGE_BUTTON_NAME_MAX_CHARS,
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
import { FOOTER_BRAND_DESCRIPTION_MAX_CHARS } from "@/lib/footer-brand-description";
import {
  hasValidLocationCoordinates,
  LOCATION_COORDINATES_REQUIRED_MESSAGE,
  parseOptionalCoordinate,
} from "@/lib/to-location-coords-payload";
import { getOnboardingEmptyMenuCategoryNames } from "../../_lib/onboarding-catering-ready";

/** API / form state may send null, strings, or numbers — normalize at runtime via parseOptionalCoordinate. */
export const optionalCoordinateSchema = z.number().optional();

//#===step-1===#
export const stepOneSchema = z
  .object({
    step: z.literal(1),
    /** Persisted from API; manual saves send true after approve. Omitted during AI bulk-apply (mode ai). */
    isApproved: z.boolean().optional(),
    has_multiple_locations: z.boolean().optional(),
    name: z.string(),
    contact_number: z
      .string()
      .min(1, "Contact number is required")
      .max(20, "Contact number must not exceed 20 characters")
      .regex(
        /^[\d\s\-+()]+$/,
        "Contact number can only contain numbers and phone formatting characters",
      ),
    email: z.string().email("Invalid email").min(1, "Email is required"),
    address: z.string().min(1, "Address is required"),
    domain: z.string().optional(),
    description: z.string().optional(),
    city: z.string().min(1, "City is required"),
    latitude: optionalCoordinateSchema,
    longitude: optionalCoordinateSchema,
  })
  .superRefine((data, ctx) => {
    if (data.has_multiple_locations === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please choose whether you have multiple locations",
        path: ["has_multiple_locations"],
      });
    }
    const trimmedName = data.name?.trim() ?? "";
    if (data.has_multiple_locations === true) {
      if (!trimmedName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Brand name is required",
          path: ["name"],
        });
      } else if (trimmedName.length > 120) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Brand name must be at most 120 characters",
          path: ["name"],
        });
      }
    } else if (!trimmedName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a venue from Google Places suggestions",
        path: ["name"],
      });
    }

    const address = data.address?.trim() ?? "";
    if (!address) return;

    const latitude = parseOptionalCoordinate(data.latitude);
    const longitude = parseOptionalCoordinate(data.longitude);
    if (latitude == null || longitude == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Select the address from Google suggestions so map coordinates can be saved.",
        path: ["address"],
      });
    }
  });
export type StepOneType = z.infer<typeof stepOneSchema>;

import { coerceApiBoolean } from "@/lib/coerce-api-boolean";

/** Snake or camel `has_multiple_locations` on any API object (root, step, venue). */
export function readHasMultipleLocationsField(source: unknown): unknown {
  if (!source || typeof source !== "object") return undefined;
  const o = source as Record<string, unknown>;
  return o.has_multiple_locations ?? o.hasMultipleLocations;
}

/** Root or nested persistence values (API may send 0/1 or strings). */
export function coerceHasMultipleLocationsFromApi(
  value: unknown,
): boolean | undefined {
  return coerceApiBoolean(value, { extendedStrings: false });
}

/** Merge API step-1 fields (e.g. brand_name, string booleans) into client stepOne shape. */
export function normalizeStepOneFromApi(
  stepOne: unknown,
): Partial<StepOneType> & Record<string, unknown> {
  if (!stepOne || typeof stepOne !== "object") {
    return {};
  }

  const raw = stepOne as Record<string, unknown>;
  const {
    brand_name: legacyBrandSnake,
    brandName: legacyBrandCamel,
    ...rest
  } = raw;

  const nameFromLegacy =
    (typeof legacyBrandSnake === "string" ? legacyBrandSnake.trim() : "") ||
    (typeof legacyBrandCamel === "string" ? legacyBrandCamel.trim() : "");
  const nameFromApi =
    typeof rest.name === "string" ? rest.name.trim() : "";
  const name = nameFromApi || nameFromLegacy;

  const has_multiple_locations = coerceHasMultipleLocationsFromApi(
    readHasMultipleLocationsField(rest),
  );

  const latitude = parseOptionalCoordinate(rest.latitude ?? rest.lat);
  const longitude = parseOptionalCoordinate(
    rest.longitude ?? rest.long,
  );

  return {
    ...rest,
    name,
    has_multiple_locations,
    latitude,
    longitude,
  } as Partial<StepOneType> & Record<string, unknown>;
}

//#===step-2===#
export const stepTwoSchema = z.object({
  step: z.literal(2),
  isApproved: z.boolean().optional(),
  logo: z.any().optional(),
  cover_image: z.any().optional(),
  banner_heading: z
    .string()
    .min(1, "Banner heading is required")
    .max(500, "Banner heading is too long")
    .refine(
      (s) => countWords(s) <= BANNER_HEADING_MAX_WORDS,
      `Banner heading must not exceed ${BANNER_HEADING_MAX_WORDS} words`
    ),
  banner_sub_heading: z
    .string()
    .min(1, "Sub heading is required")
    .max(80, "Sub heading must not exceed 80 characters"),
  about_title: z
    .string()
    .min(1, "Title is required")
    .max(40, "Title must not exceed 40 characters"),
  about_description: z.string().min(1, "Description is required"),
  footer_brand_description: z.string().refine(
    (s) => plainTextCharCount(s) <= FOOTER_BRAND_DESCRIPTION_MAX_CHARS,
    `Footer brand description must not exceed ${FOOTER_BRAND_DESCRIPTION_MAX_CHARS} characters`,
  ),
});
export type StepTwoType = z.infer<typeof stepTwoSchema>;

//#===step-3===#

export const stepThreeSchema = z.object({
  isApproved: z.boolean().optional(),
  step: z.literal(3),
  vendor_location_id: z.number().optional(),
  event_id: z.number().optional(),
  event_category_id: z.number().min(1, "Event Category is required"),
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
  event_address: z.string().min(1, "Event address is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  location: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
    })
    .optional(),
});
export type StepThreeType = z.infer<typeof stepThreeSchema>;

//#===step-4===#
export const stepFourSchema = z
  .object({
    step: z.literal(4),
    isApproved: z.boolean().optional(),
    event_id: z.number().min(1, "Event ID is required"),
    package_image: z
      .union([z.instanceof(File), z.string().url(), z.null()])
      .nullable()
      .optional(),
    package_title: z
      .string()
      .min(1, "Main event heading is required")
      .max(
        EVENT_PACKAGE_MAIN_HEADING_MAX_CHARS,
        `Main event heading must not exceed ${EVENT_PACKAGE_MAIN_HEADING_MAX_CHARS} characters`
      ),
    package_description: z
      .string()
      .min(1, "Package subheading is required")
      .max(
        EVENT_PACKAGE_SUB_HEADING_MAX_CHARS,
        `Package subheading must not exceed ${EVENT_PACKAGE_SUB_HEADING_MAX_CHARS} characters`
      ),
    package_button_name: z
      .string()
      .min(1, "Button name is required")
      .max(
        PACKAGE_BUTTON_NAME_MAX_CHARS,
        `Button name must not exceed ${PACKAGE_BUTTON_NAME_MAX_CHARS} characters`
      ),
    package_details: z
      .array(
        z.object({
          title: z
            .string()
            .min(1, "Title is required")
            .max(
              PACKAGE_DETAIL_LINE_MAX_CHARS,
              `Highlight title must not exceed ${PACKAGE_DETAIL_LINE_MAX_CHARS} characters`
            ),
        })
      )
      .min(1, "At least one highlight is required"),
    event_schedular_title: z
      .string()
      .max(40, "Event schedular title must not exceed 40 characters"),
    event_schedule_subtitle: z
      .string()
      .max(160, "Custom copy must not exceed 160 characters"),
    event_schedular: z
      .array(
        z.object({
          title: z
            .string()
            .max(40, "Schedule title must not exceed 40 characters"),
          time: z.string(),
        }),
      )
      .superRefine((schedules, ctx) => {
        schedules.forEach((schedule, index) => {
          const hasTitle = Boolean(schedule.title?.trim());
          const hasTime = Boolean(schedule.time?.trim());

          if (
            hasTime &&
            !/^([01]\d|2[0-3]):([0-5]\d)$/.test(schedule.time!.trim())
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Time must be in HH:mm format",
              path: [index, "time"],
            });
          }
        });

      }),
    gallery: z
      .array(
        z.union([
          z.instanceof(File),
          z.object({
            id: z.number(),
            url: z.string().url(),
          }),
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
      message: "Highlights image is required",
      path: ["package_image"],
    }
  );
export type StepFourType = z.infer<typeof stepFourSchema>;

/** Drops blank timeline rows before persisting optional schedules. */
export function normalizeEventSchedularForSave(
  schedules: Array<{ title?: string; time?: string }> | undefined,
): Array<{ title: string; time: string }> {
  return (schedules ?? [])
    .filter(
      (schedule) =>
        String(schedule.title ?? "").trim().length > 0 &&
        String(schedule.time ?? "").trim().length > 0,
    )
    .map((schedule) => ({
      title: String(schedule.title).trim(),
      time: String(schedule.time).trim(),
    }));
}

//#===step-5===#

// Create a validation function for reuse across schemas
const validateDepositDueDate = (data: unknown) => {
  const { booking_type, payment_type, deposit_due_date } = data as {
    booking_type: string;
    payment_type: string;
    deposit_due_date: string | undefined;
  };
  // Only validate payment fields for tables/both booking types
  if (booking_type === "tickets") {
    return true;
  }

  if (payment_type !== "deposit") {
    return true;
  }

  return deposit_due_date && deposit_due_date.trim() !== "";
};

const depositDueDateMessage = {
  message: "Balance due date is required when deposit payment is selected",
  path: ["deposit_due_date"],
};

// Base schema for date - add booking_type to the base schema
const normalizeBoolean = (value: unknown) => coerceApiBoolean(value);

const normalizeDepositType = (value: unknown) => {
  if (typeof value !== "string") return undefined;

  const lower = value.toLowerCase();
  if (lower === "amount" || lower === "percentage") {
    return lower;
  }

  return "amount";
};

const baseDateSchema = z.object({
  event_date: z.string().min(1, "Date is required"),
  booking_type: z.enum(["tickets", "tables", "both"]),
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

// Modified ticket date schema - now conditionally applies based on booking_type value
const dateSchema = baseDateSchema
  .extend({
    // Ticket/table rows may be preserved while that option is unchecked.
    // Strict field rules run in superRefine only when booking_type includes them.
    tickets: z
      .array(
        z.object({
          title: z
            .string()
            .max(25, "Ticket title must not exceed 25 characters"),
          description: z
            .string()
            .max(160, "Ticket description must not exceed 160 characters"),
          total_capacity: z.union([z.string(), z.number()]),
          price: z.union([z.string(), z.number()]),
          discount_type: z.enum(["none", "percentage", "fixed"]).optional(),
          discount_value: z.union([z.string(), z.number()]).optional(),
        })
      )
      .optional(),
    total_ticket_types: z.number().optional(),
    tables: z
      .array(
        z.object({
          min_persons: z.union([z.string(), z.number()]),
          max_persons: z.union([z.string(), z.number()]),
          price: z.union([z.string(), z.number()]),
          total_tables: z.union([z.string(), z.number()]),
          discount_type: z.enum(["none", "percentage", "fixed"]).optional(),
          discount_value: z.union([z.string(), z.number()]).optional(),
        })
      )
      .optional(),
    total_table_types: z.number().optional(),
  })
  .refine(validateDepositDueDate, depositDueDateMessage)
  .superRefine((data, ctx) => {
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

    if (!tablesActive) {
      return;
    }

    if (data.payment_type !== "deposit") {
      return;
    }

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

    if (Number.isNaN(value) || value === undefined || value <= 0) {
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
      if (data.booking_type === "tickets" || data.booking_type === "both") {
        return Array.isArray(data.tickets) && data.tickets.length > 0;
      }
      return true;
    },
    {
      message:
        "At least one ticket is required when ticket booking is selected",
      path: ["tickets"],
    }
  )
  .refine(
    (data) => {
      if (data.booking_type === "tables" || data.booking_type === "both") {
        return Array.isArray(data.tables) && data.tables.length > 0;
      }
      return true;
    },
    {
      message: "At least one table is required when table booking is selected",
      path: ["tables"],
    }
  );

// Updated stepFiveSchema - simpler now with per-date booking_type
export const stepFiveSchema = z
  .object({
    step: z.literal(5),
    isApproved: z.boolean().optional(),
    event_id: z.number().min(1, "Event ID is required"),
    dates: z.array(dateSchema).min(1, "At least one date is required"),
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

export type StepFiveType = z.infer<typeof stepFiveSchema>;

// Updated helper function to include booking_type in the date structure
export const getDefaultDate = (
  bookingType: "tickets" | "tables" | "both" = "tickets"
): StepFiveType["dates"][number] => {
  const baseDate = {
    event_date: "",
    booking_type: bookingType,
  };

  switch (bookingType) {
    case "tickets":
      return {
        ...baseDate,
        total_ticket_types: 1,
        tickets: [
          { title: "", description: "", total_capacity: "", price: "", discount_type: "none", discount_value: "" },
        ],
        total_table_types: 0,
        tables: [],
      };
    case "tables":
      return {
        ...baseDate,
        payment_type: "full" as const,
        is_deposit_enabled: false,
        total_table_types: 1,
        tables: [
          { min_persons: "", max_persons: "", price: "", total_tables: "", discount_type: "none", discount_value: "" },
        ],
        total_ticket_types: 0,
        tickets: [],
      };
    case "both":
      return {
        ...baseDate,
        payment_type: "full" as const,
        is_deposit_enabled: false,
        total_table_types: 1,
        tables: [
          { min_persons: "", max_persons: "", price: "", total_tables: "", discount_type: "none", discount_value: "" },
        ],
        total_ticket_types: 1,
        tickets: [
          { title: "", description: "", total_capacity: "", price: "", discount_type: "none", discount_value: "" },
        ],
      };
  }
};

//#===step-6===#
export const stepSixSchema = z
  .object({
    step: z.literal(6),
    isApproved: z.boolean().optional(),
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
      .optional(),
  })
  .superRefine((data, ctx) => {
    // If catering_option is 1 (Yes), validate menu fields
    if (data.catering_option === 1) {
      if (!data.menu_title || data.menu_title.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Menu title is required when catering option is Yes",
          path: ["menu_title"],
        });
      }

      if (!data.menu_description || data.menu_description.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Menu description is required when catering option is Yes",
          path: ["menu_description"],
        });
      }

      // A menu category MUST exist before any menu items can be saved.
      // Menu blocks can be populated from AI prefill / hydration without a
      // backend category ever being created (categories API returns `data: []`),
      // so this must be enforced whenever catering is Yes — not only when the
      // menus array is empty.
      if (!data.event_menu_category_id || data.event_menu_category_id < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Create or select a menu category before adding menu items",
          path: ["event_menu_category_id"],
        });
      }

      if (!data.menus || data.menus.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one menu is required when catering option is Yes",
          path: ["menus"],
        });
      }

      getOnboardingEmptyMenuCategoryNames(data.menus).forEach((categoryName) => {
        const menuIndex = (data.menus ?? []).findIndex(
          (menu) => String(menu.name ?? "").trim() === categoryName,
        );
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Add at least one item to ${categoryName}.`,
          path: ["menus", Math.max(menuIndex, 0), "items"],
        });
      });
    }
  });
export type StepSixType = z.infer<typeof stepSixSchema>;

export const StepSixSchema = stepSixSchema;

//#===step-7===#
export const stepSevenSchema = z
  .object({
    step: z.number(),
    isApproved: z.boolean().optional(),
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
    // Legacy location fields remain readable for existing onboarding events.
    event_address: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    price_start_from: z
      .string()
      .optional()
      .default("")
      .refine(
        (val) => {
          if (!val) return true;
          const num = Number(val);
          return !Number.isNaN(num) && num >= 0 && num <= 999999;
        },
        { message: "Price must be between 0 and 999999" }
      ),
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





export type StepSevenType = z.infer<typeof stepSevenSchema>;

//#===step-8===#

export const stepEightSchema = z.object({
  step: z.number(),
  isApproved: z.boolean().optional(),
  event_id: z.number(),
  drink_title: z
    .string()
    .min(1, "The drink title field is required")
    .max(
      DRINK_SECTION_TITLE_MAX_CHARS,
      `Drink title must not exceed ${DRINK_SECTION_TITLE_MAX_CHARS} characters`
    ),
  drink_description: z
    .string()
    .min(1, "The drink description field is required")
    .max(
      DRINK_SECTION_DESCRIPTION_MAX_CHARS,
      `Drink description must not exceed ${DRINK_SECTION_DESCRIPTION_MAX_CHARS} characters`
    ),
  packages: z
    .array(
      z.object({
        id: z.number().optional(), // Optional for backward compatibility (required when from API)
        title: z
          .string()
          .min(1, "Extra option title is required")
          .max(
            DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS,
            `Extra option title must not exceed ${DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS} characters`
          ),
        description: z
          .string()
          .min(1, "Extra option description is required")
          .refine(
            (val) =>
              plainTextCharCount(val) <= RICH_DESCRIPTION_MAX_CHARS,
            {
              message: `Extra option description must not exceed ${RICH_DESCRIPTION_MAX_CHARS} characters`,
            }
          ),
        price: z.union([z.number(), z.string()]).refine(
          (val) => {
            // Check if value is empty, null, or undefined
            if (val === "" || val === null || val === undefined) {
              return false;
            }
            const num = typeof val === "string" ? Number.parseFloat(val) : val;
            return (
              !Number.isNaN(num) && num > 0 && num <= DRINK_PACKAGE_PRICE_MAX
            );
          },
          {
            message: `Extra price is required and must be between 1 and ${DRINK_PACKAGE_PRICE_MAX}`,
          }
        ),
        available_quantity: z.preprocess(
          (val) => {
            // Convert undefined, null, NaN, or empty string to undefined
            if (
              val === undefined ||
              val === null ||
              val === "" ||
              (typeof val === "number" && Number.isNaN(val))
            ) {
              return undefined;
            }
            // Convert string to number
            if (typeof val === "string") {
              const num = Number.parseFloat(val);
              return Number.isNaN(num) ? undefined : num;
            }
            return val;
          },
          z.union([z.number(), z.undefined()]).superRefine((val, ctx) => {
            if (val === undefined || val === null) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Available quantity is required",
              });
              return;
            }
            const num =
              typeof val === "number" ? val : Number.parseFloat(String(val));
            if (Number.isNaN(num)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Available quantity must be a number",
              });
              return;
            }
            if (num < 1) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Available quantity must be at least 1",
              });
              return;
            }
            if (num > DRINK_PACKAGE_QTY_MAX) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Available quantity cannot exceed ${DRINK_PACKAGE_QTY_MAX}`,
              });
            }
          })
        ) as z.ZodType<number, z.ZodTypeDef, unknown>,
      })
    )
    .min(1, "At least one package is required"),
});
export type StepEightType = z.infer<typeof stepEightSchema>;

//#===step-9===#
/** Site-wide cap for FAQs (manual step, AI generation, and API apply). */
export const STEP_NINE_MAX_FAQS = 10;

const stepNineFaqItemSchema = z.object({
  id: z.number().optional(),
  question: z
    .string()
    .min(1, "Question is required")
    .max(160, "Question must not exceed 160 characters"),
  answer: z
    .string()
    .min(1, "Answer is required")
    .max(500, "Answer must not exceed 500 characters"),
});

export const stepNineSchema = z.object({
  step: z.number(),
  isApproved: z.boolean().optional(),
  event_id: z.number(),
  faqs: z
    .array(stepNineFaqItemSchema)
    .max(
      STEP_NINE_MAX_FAQS,
      `You can add at most ${STEP_NINE_MAX_FAQS} FAQs`,
    ),
  deleted_faq_ids: z.array(z.number()).optional(),
});
export type StepNineType = z.infer<typeof stepNineSchema>;

//#===step-10===#
// Payment gateway schema (backend structure)
/** Laravel often sends `null` for absent strings; `z.string().optional()` rejects null and breaks the whole step. */
const nullableGatewayString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v === null || v === undefined ? undefined : v));

/** Treat common API shapes as connected for onboarding gating (string, boolean, int). */
export function isGatewayStatusActive(status: unknown): boolean {
  if (status === true || status === 1 || status === "1" || status === "true") {
    return true;
  }
  if (typeof status === "string") {
    return status.trim().toLowerCase() === "active";
  }
  return false;
}

const gatewayStatusSchema = z.preprocess((val: unknown) => {
  if (val === true || val === 1 || val === "1" || val === "true") {
    return "active";
  }
  if (typeof val === "string") {
    const s = val.trim().toLowerCase();
    if (
      s === "pending" ||
      s === "active" ||
      s === "under_review" ||
      s === "restricted"
    ) {
      return s;
    }
  }
  return val;
}, z.enum(["pending", "active", "under_review", "restricted"]).optional());

const paymentGatewaySchema = z.object({
  status: gatewayStatusSchema,
  account_id: nullableGatewayString.optional(),
  bank: z
    .object({
      bank_name: nullableGatewayString.optional(),
      account_masked: nullableGatewayString.optional(),
    })
    .optional(),
});

const paymentGatewaysSchema = z.object({
  stripe: paymentGatewaySchema.optional(),
  paypal: paymentGatewaySchema.optional(),
  truelayer: paymentGatewaySchema.optional(),
  worldpay: paymentGatewaySchema.optional(),
  klarna: paymentGatewaySchema.optional(),
});

export const stepTenSchema = z.object({
  step: z.number(),
  isApproved: z.boolean().optional(),
  event_id: z.number(),
  accept_payment_method: z.enum(["bank_transfer", "payment_gateway", "both"], {
    required_error: "Choose how guests can pay.",
  }),
  payment_gateways: paymentGatewaysSchema.optional(),
  is_skipped: z.boolean().default(false),
})
  .superRefine((data, ctx) => {
    // Validate that at least one payment gateway is ACTIVE if not skipped
    if (!data.is_skipped) {
      const hasAnyGatewayActive =
        isGatewayStatusActive(data.payment_gateways?.stripe?.status) ||
        isGatewayStatusActive(data.payment_gateways?.paypal?.status) ||
        isGatewayStatusActive(data.payment_gateways?.truelayer?.status) ||
        isGatewayStatusActive(data.payment_gateways?.worldpay?.status) ||
        isGatewayStatusActive(data.payment_gateways?.klarna?.status);

      if (!hasAnyGatewayActive) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Connect at least one payment method (bank, Stripe, or PayPal) to continue, or skip payment and continue.",
          path: ["payment_gateways"],
        });
      }
    }
  });


export type StepTenType = z.infer<typeof stepTenSchema>;

//#===step-11===#
export const stepElevenSchema = z.object({
  step: z.number(),
  isApproved: z.boolean().optional(),
  event_id: z.number(),
  /** Persisted from API; also merged into `stepOne` for step 1 gate / brand mode. */
  has_multiple_locations: z.boolean().optional(),
  reminder_email_before_days: z.number().optional(),
  submit_type: z.enum(["duplicate", "submit"]),
  city: z.string().optional(),
  address: z.string().optional(),
  contact_number: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  /** Subdomain label only (no host suffix). */
  domain: z.string().min(1, "Please select a domain for your website"),
  /**
   * Fixed host suffix shown beside the subdomain input (from API `domain_suffix`).
   * Display-only; not required on save.
   */
  domain_suffix: z.string().optional(),
  /**
   * Client confirmation checkbox. Restored from `isApproved` when the current
   * domain matches the last saved domain from the steps API.
   */
  confirm_domain: z.boolean().refine((val) => val === true, {
    message: "Please confirm your domain selection to continue",
  }),
}).superRefine((data, ctx) => {
  if (data.submit_type === "duplicate") {
    if (!data.city || data.city.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "City is required when duplicating an event",
        path: ["city"],
      });
    }

    if (!data.address || data.address.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Address is required when duplicating an event",
        path: ["address"],
      });
    }

    if (!data.contact_number || data.contact_number.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Contact number is required when duplicating an event",
        path: ["contact_number"],
      });
    } else {
      // Validate that contact number contains only valid phone characters
      const phoneRegex = /^[0-9+\-() ]+$/;
      if (!phoneRegex.test(data.contact_number)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Contact number can only contain numbers and phone formatting characters (+, -, spaces, parentheses)",
          path: ["contact_number"],
        });
      }
    }

    if (!hasValidLocationCoordinates(data.latitude, data.longitude)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: LOCATION_COORDINATES_REQUIRED_MESSAGE,
        path: ["address"],
      });
    }
  }
});

















export type StepElevenType = z.infer<typeof stepElevenSchema>;

// //#===Preview Type===#
// export const OnBoardingPreviewSchema = z;

// export type OnBoardingPreviewType = z.infer<typeof OnBoardingPreviewSchema>;

//#===multi-space (rooms) ===#
/**
 * Multi-room ("event spaces") system: opt-in on Step 4. When enabled, vendors define up to
 * {@link MAX_ROOMS} rooms and Steps 4–7 are filled per room via a tab UI. Single-room users
 * continue to use the existing `stepFour…stepSeven` blocks unchanged.
 */
export const MAX_ROOMS = 3;

/**
 * Per-room data shape. Mirrors the relevant fields of `stepFour…stepSeven` minus the wizard-level
 * `step` / `event_id` / `isApproved` keys (those live on the wizard step, not the room). Each
 * room carries its own `isApproved*` flag per sub-section so room-level progress is preserved.
 *
 * Validation is intentionally permissive here so an in-progress room (e.g. user just added it
 * and only filled the package) doesn't fail validation of the whole `multiSpace` block. Strict
 * per-section validation is enforced by each step at submit time, identical to single-room mode.
 */
const roomPackageSchema = z.object({
  package_image: z
    .union([z.instanceof(File), z.string().url(), z.null()])
    .nullable()
    .optional(),
  package_title: z.string().optional().default(""),
  package_description: z.string().optional().default(""),
  package_button_name: z.string().optional().default(""),
  package_details: z
    .array(z.object({ title: z.string().optional().default("") }))
    .optional()
    .default([]),
  event_schedular_title: z.string().optional().default(""),
  event_schedule_subtitle: z.string().optional().default(""),
  event_schedular: z
    .array(
      z.object({
        title: z.string().optional().default(""),
        time: z.string().optional().default(""),
      }),
    )
    .optional()
    .default([]),
  gallery: z
    .array(
      z.union([
        z.instanceof(File),
        z.object({ id: z.number(), url: z.string().url() }),
      ]),
    )
    .optional(),
});

const roomDatesSchema = z.object({
  // Reuse the same per-date shape as stepFive but make the array optional
  // (a freshly-added room may not have any dates yet).
  dates: z.array(z.any()).optional().default([]),
});

const roomCateringSchema = z.object({
  catering_option: z.number().min(0).max(1).optional().default(0),
  menu_title: z.string().optional().default(""),
  menu_description: z.string().optional().default(""),
  event_menu_category_id: z.number().optional(),
  menus: z.array(z.any()).optional().default([]),
});

const roomBrochureSchema = z.object({
  brochure_pdf: z
    .union([z.instanceof(File), z.string().url(), z.null()])
    .optional(),
  brochure_pdf_2: z
    .union([z.instanceof(File), z.string().url(), z.null()])
    .optional(),
  faq_pdf: z
    .union([z.instanceof(File), z.string().url(), z.null()])
    .optional(),
  remove_brochure_pdf: z.boolean().optional(),
  remove_brochure_pdf_2: z.boolean().optional(),
  remove_faq_pdf: z.boolean().optional(),
  event_address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  price_start_from: z.string().optional().default(""),
  location: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
    })
    .optional(),
  price: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      link: z.string().optional(),
      icon: z.string().optional(),
      price_title: z.string().optional(),
    })
    .optional(),
  downloads: z.array(z.any()).optional().default([]),
  more_info: z.array(z.any()).optional().default([]),
});

const roomDrinksSchema = z.object({
  drink_title: z.string().optional().default(""),
  drink_description: z.string().optional().default(""),
  packages: z
    .array(
      z.object({
        id: z.number().optional(),
        title: z.string().optional().default(""),
        description: z.string().optional().default(""),
        price: z.union([z.number(), z.string()]).optional(),
        available_quantity: z.union([z.number(), z.string()]).optional(),
      }),
    )
    .optional()
    .default([]),
});

export const roomSchema = z.object({
  /** Backend room id (assigned after first save). */
  id: z.number().optional(),
  /** Display name of the room (e.g. "Grand Ballroom"). */
  name: z
    .string()
    .min(1, "Room name is required")
    .max(40, "Room name must not exceed 40 characters"),
  /** Per-section approval flags so Stepper / preview can show completion per room. */
  isApprovedPackage: z.boolean().optional(),
  isApprovedDates: z.boolean().optional(),
  isApprovedCatering: z.boolean().optional(),
  isApprovedBrochure: z.boolean().optional(),
  isApprovedDrinks: z.boolean().optional(),
  package: roomPackageSchema.default({}),
  dates: roomDatesSchema.default({ dates: [] }),
  /** Last dates payload successfully persisted to the API for this room. */
  persistedDates: roomDatesSchema.optional(),
  catering: roomCateringSchema.default({}),
  brochure: roomBrochureSchema.default({}),
  drinks: roomDrinksSchema.default({}),
});
export type RoomType = z.infer<typeof roomSchema>;

export const multiSpaceSchema = z.object({
  /** True when the vendor selected "Yes" to multiple event spaces on Step 4. */
  enabled: z.boolean().default(false),
  /** Active room tab in the UI (0-based index into `rooms`). */
  currentRoomIndex: z.number().min(0).default(0),
  rooms: z
    .array(roomSchema)
    .max(MAX_ROOMS, `You can add at most ${MAX_ROOMS} rooms`)
    .default([]),
});
export type MultiSpaceType = z.infer<typeof multiSpaceSchema>;

//#===on-boarding-schema===#
export const onboardingSchema = z.object({
  isApproved: z.boolean().default(false),
  activeStep: z.number().min(1).max(11),
  last_completed_step: z.number().min(1).max(11),
  /**
   * Multi-space (rooms) container. Optional so existing single-room data continues to validate
   * without it. The Step 4 toggle owns the `enabled` flag.
   */
  multiSpace: multiSpaceSchema.optional(),
  stepOne: stepOneSchema,
  stepTwo: stepTwoSchema,
  stepThree: stepThreeSchema,
  stepFour: stepFourSchema,
  stepFive: stepFiveSchema,
  stepSix: stepSixSchema,
  stepSeven: stepSevenSchema,
  stepEight: stepEightSchema,
  stepNine: stepNineSchema,
  stepTen: stepTenSchema,
  stepEleven: stepElevenSchema,
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
