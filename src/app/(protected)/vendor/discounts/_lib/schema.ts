import { z } from "zod";
import {
  COUPON_BANNER_HEADING_MAX,
  COUPON_BANNER_TEXT_MAX,
  COUPON_STRIP_DEFAULT_HEADING,
} from "@/lib/coupon-strip-props";

/** Parse `YYYY-MM-DD` as a local calendar day (no timezone shift). */
export function parseLocalDate(value: string): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Today's date as `YYYY-MM-DD` for `<input type="date" min>`. */
export function todayIsoDate(): string {
  const d = startOfToday();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Format `YYYY-MM-DD` for guide-style validation messages. */
export function formatGuideDate(iso: string): string {
  const d = parseLocalDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const discountDateEntrySchema = z.object({
  date_id: z.coerce.number().default(0),
  /** Event calendar day — used for labels and “expiry ≤ event date”. */
  event_date: z.string().default(""),
  room_id: z.coerce.number().default(0),
  value_type: z.enum(["percentage", "flat"]).default("percentage"),
  discount_value: z.coerce.number().default(0),
  flat_mode: z.enum(["total", "per_person"]).optional().nullable(),
  min_people: z.coerce.number().optional().nullable(),
  valid_from: z.string().optional().nullable(),
  /** Saved start when editing — a legacy past date may stay as-is */
  original_valid_from: z.string().optional().nullable(),
  expires_at: z.string().default(""),
  /**
   * When true, show this offer’s badge (e.g. 10% OFF) on the public event
   * date picker. Per-date — discounts only.
   */
  show_on_banner: z.boolean().default(true),
  /**
   * When true, this date’s offer is live for checkout as soon as saved.
   * Off keeps the row saved but paused.
   */
  is_live: z.boolean().default(true),
});

export type DiscountDateFormEntry = z.infer<typeof discountDateEntrySchema>;

/** No value and no expiry — placeholder slot, not a real offer yet. */
export function isDiscountDateOfferBlank(entry: {
  discount_value?: number | null;
  expires_at?: string | null;
}): boolean {
  return !(Number(entry.discount_value) > 0) && !Boolean(entry.expires_at?.trim());
}

export const defaultDiscountDateEntry = (): DiscountDateFormEntry => ({
  date_id: 0,
  event_date: "",
  room_id: 0,
  value_type: "percentage",
  discount_value: 0,
  flat_mode: null,
  min_people: null,
  valid_from: "",
  original_valid_from: "",
  expires_at: "",
  show_on_banner: true,
  is_live: true,
});

function refineDateWindow(
  entry: {
    valid_from?: string | null;
    original_valid_from?: string | null;
    expires_at: string;
    event_date?: string;
  },
  ctx: z.RefinementCtx,
  pathPrefix: (string | number)[],
) {
  const today = startOfToday();
  const expiresAt = parseLocalDate(entry.expires_at);
  if (!entry.expires_at?.trim() || !expiresAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a valid expiry date",
      path: [...pathPrefix, "expires_at"],
    });
  } else if (expiresAt < today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Expiry date cannot be in the past",
      path: [...pathPrefix, "expires_at"],
    });
  }

  const eventDateRaw = entry.event_date?.trim() ?? "";
  const eventDate = eventDateRaw ? parseLocalDate(eventDateRaw) : null;
  if (expiresAt && eventDate && expiresAt > eventDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expiry can't be later than the event date (${formatGuideDate(eventDateRaw)}).`,
      path: [...pathPrefix, "expires_at"],
    });
  }

  const validFromRaw = entry.valid_from?.trim() ?? "";
  if (validFromRaw) {
    const validFrom = parseLocalDate(validFromRaw);
    const unchangedFromSaved =
      validFromRaw === (entry.original_valid_from?.trim() ?? "");
    if (!validFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid start date",
        path: [...pathPrefix, "valid_from"],
      });
    } else if (validFrom < today && !unchangedFromSaved) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valid from cannot be in the past",
        path: [...pathPrefix, "valid_from"],
      });
    } else if (expiresAt && validFrom > expiresAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valid from must be before the expiry date.",
        path: [...pathPrefix, "valid_from"],
      });
    }
  }
}

function refineOfferValue(
  entry: {
    value_type: "percentage" | "flat";
    discount_value: number;
    flat_mode?: "total" | "per_person" | null;
    min_people?: number | null;
  },
  ctx: z.RefinementCtx,
  pathPrefix: (string | number)[],
) {
  if (!(entry.discount_value > 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a discount value",
      path: [...pathPrefix, "discount_value"],
    });
  }

  if (entry.value_type === "percentage") {
    if (entry.discount_value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentage cannot exceed 100",
        path: [...pathPrefix, "discount_value"],
      });
    }
    return;
  }

  if (entry.discount_value > 100_000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Amount looks too high — please check",
      path: [...pathPrefix, "discount_value"],
    });
  }
  if (!entry.flat_mode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please select how the fixed amount applies",
      path: [...pathPrefix, "flat_mode"],
    });
  }
  if (
    entry.flat_mode === "per_person" &&
    (!entry.min_people || entry.min_people < 1)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a minimum number of people for this discount.",
      path: [...pathPrefix, "min_people"],
    });
  }
  if (
    entry.flat_mode === "per_person" &&
    entry.min_people != null &&
    entry.min_people > 500
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimum party size looks too high",
      path: [...pathPrefix, "min_people"],
    });
  }
}

export const discountFormSchema = z
  .object({
    name: z
      .string()
      .max(120, "Keep the display name under 120 characters")
      .optional()
      .nullable(),
    category: z.enum(["discount", "coupon_code"]),
    /** From header location — validated, not sent in body */
    location_id: z.coerce
      .number()
      .refine((n) => n > 0, "Please select a location in the header"),
    event_id: z.coerce.number().refine((n) => n > 0, "Please select an event"),
    /** Multi-date Discount rows */
    dates: z.array(discountDateEntrySchema).default([]),
    coupon_code: z.string().optional().nullable(),
    /**
     * Show on the customer-facing event page (coupon banner strip, or
     * discount badges). Turn off for private / email-only offers.
     */
    show_on_banner: z.boolean().default(true),
    /** Small eyebrow on the coupon strip (e.g. Limited time offer). */
    banner_heading: z
      .string()
      .max(
        COUPON_BANNER_HEADING_MAX,
        `Keep banner heading under ${COUPON_BANNER_HEADING_MAX} characters`,
      )
      .optional()
      .nullable(),
    /** Main promo line (subheading) on the coupon strip. */
    dynamic_text: z
      .string()
      .max(
        COUPON_BANNER_TEXT_MAX,
        `Keep banner subheading under ${COUPON_BANNER_TEXT_MAX} characters`,
      )
      .optional()
      .nullable(),
    customer_audience: z.enum(["all_active", "selected"]).default("all_active"),
    customer_ids: z.array(z.number()).default([]),
    /** Coupon-only offer fields */
    value_type: z.enum(["percentage", "flat"]).default("percentage"),
    discount_value: z.coerce.number().default(0),
    flat_mode: z.enum(["total", "per_person"]).optional().nullable(),
    min_people: z.coerce.number().optional().nullable(),
    valid_from: z.string().optional().nullable(),
    original_valid_from: z.string().optional().nullable(),
    expires_at: z.string().default(""),
    status: z.enum(["active", "inactive"]),
  })
  .superRefine((data, ctx) => {
    if (data.category === "discount") {
      // Empty slots (auto-filled, never configured) are ignored — offers are optional per date.
      const configuredIndexes = (data.dates ?? [])
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => !isDiscountDateOfferBlank(entry));

      if (configuredIndexes.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Set at least one date offer (value and expiry).",
          path: ["dates"],
        });
        return;
      }

      // Same calendar date may appear once per room (date_id + room_id).
      const seen = new Map<string, number>();
      configuredIndexes.forEach(({ entry, index }) => {
        if (!(entry.date_id > 0)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please select a date",
            path: ["dates", index, "date_id"],
          });
        } else {
          const roomKey = Number(entry.room_id) > 0 ? Number(entry.room_id) : 0;
          const key = `${entry.date_id}:${roomKey}`;
          if (seen.has(key)) {
            const label = entry.event_date
              ? formatGuideDate(entry.event_date)
              : "This date";
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                roomKey > 0
                  ? `${label} for this room has already been added to this discount.`
                  : `${label} has already been added to this discount.`,
              path: ["dates", index, roomKey > 0 ? "room_id" : "date_id"],
            });
          } else {
            seen.set(key, index);
          }
        }

        refineOfferValue(entry, ctx, ["dates", index]);
        refineDateWindow(entry, ctx, ["dates", index]);
      });
      return;
    }

    // Coupon
    const code = data.coupon_code?.trim() ?? "";
    if (!code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a coupon code.",
        path: ["coupon_code"],
      });
    } else if (code.length > 40) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Coupon code must be 40 characters or fewer",
        path: ["coupon_code"],
      });
    } else if (!/^[A-Za-z0-9_-]+$/.test(code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use letters, numbers, - or _ only",
        path: ["coupon_code"],
      });
    }

    if (data.show_on_banner !== false) {
      const heading = data.banner_heading?.trim() ?? "";
      if (!heading) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a banner heading (e.g. Limited time offer).",
          path: ["banner_heading"],
        });
      }
      // Banner subheading (`dynamic_text`) is optional.
    }

    if (
      data.customer_audience === "selected" &&
      (!data.customer_ids || data.customer_ids.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select at least one customer",
        path: ["customer_ids"],
      });
    }

    refineOfferValue(
      {
        value_type: data.value_type,
        discount_value: data.discount_value,
        flat_mode: data.flat_mode,
        min_people: data.min_people,
      },
      ctx,
      [],
    );
    refineDateWindow(
      {
        valid_from: data.valid_from,
        original_valid_from: data.original_valid_from,
        expires_at: data.expires_at,
      },
      ctx,
      [],
    );
  });

export type DiscountFormValues = z.infer<typeof discountFormSchema>;

export const defaultDiscountFormValues: DiscountFormValues = {
  name: "",
  category: "discount",
  location_id: 0,
  event_id: 0,
  dates: [],
  coupon_code: "",
  show_on_banner: true,
  banner_heading: COUPON_STRIP_DEFAULT_HEADING,
  dynamic_text: "",
  customer_audience: "all_active",
  customer_ids: [],
  value_type: "percentage",
  discount_value: 0,
  flat_mode: null,
  min_people: null,
  valid_from: "",
  original_valid_from: "",
  expires_at: "",
  status: "active",
};
