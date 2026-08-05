import { z } from "zod";

/** Parse `YYYY-MM-DD` as a local calendar day (no timezone shift). */
function parseLocalDate(value: string): Date | null {
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
    /** Physical room id when the selected date has rooms */
    room_id: z.coerce.number().default(0),
    /** API `date_id` from events-with-dates */
    date_id: z.coerce.number().default(0),
    coupon_code: z.string().optional().nullable(),
    customer_audience: z.enum(["all_active", "selected"]).default("all_active"),
    customer_ids: z.array(z.number()).default([]),
    value_type: z.enum(["percentage", "flat"]),
    discount_value: z.coerce.number().positive("Enter a discount value"),
    flat_mode: z.enum(["total", "per_person"]).optional().nullable(),
    min_people: z.coerce.number().optional().nullable(),
    valid_from: z.string().optional().nullable(),
    expires_at: z.string().min(1, "Expiry date is required"),
    status: z.enum(["active", "inactive"]),
  })
  .superRefine((data, ctx) => {
    if (data.category === "discount") {
      if (!(data.date_id > 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please select a date",
          path: ["date_id"],
        });
      }
    }

    if (data.category === "coupon_code") {
      const code = data.coupon_code?.trim() ?? "";
      if (!code) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a coupon code",
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
    }

    if (data.value_type === "percentage") {
      if (data.discount_value > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Percentage cannot exceed 100",
          path: ["discount_value"],
        });
      }
    } else if (data.value_type === "flat") {
      if (data.discount_value > 100_000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Amount looks too high — please check",
          path: ["discount_value"],
        });
      }
      if (!data.flat_mode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please select how the fixed amount applies",
          path: ["flat_mode"],
        });
      }
      if (
        data.flat_mode === "per_person" &&
        (!data.min_people || data.min_people < 1)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Minimum party size is required",
          path: ["min_people"],
        });
      }
      if (
        data.flat_mode === "per_person" &&
        data.min_people != null &&
        data.min_people > 500
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Minimum party size looks too high",
          path: ["min_people"],
        });
      }
    }

    const today = startOfToday();
    const expiresAt = parseLocalDate(data.expires_at);
    if (!expiresAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid expiry date",
        path: ["expires_at"],
      });
    } else if (expiresAt < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expiry date cannot be in the past",
        path: ["expires_at"],
      });
    }

    const validFromRaw = data.valid_from?.trim() ?? "";
    if (validFromRaw) {
      const validFrom = parseLocalDate(validFromRaw);
      if (!validFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid start date",
          path: ["valid_from"],
        });
      } else if (expiresAt && validFrom > expiresAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Valid from must be on or before the expiry date",
          path: ["valid_from"],
        });
      }
    }
  });

export type DiscountFormValues = z.infer<typeof discountFormSchema>;

export const defaultDiscountFormValues: DiscountFormValues = {
  name: "",
  category: "discount",
  location_id: 0,
  event_id: 0,
  room_id: 0,
  date_id: 0,
  coupon_code: "",
  customer_audience: "all_active",
  customer_ids: [],
  value_type: "percentage",
  discount_value: 0,
  flat_mode: null,
  min_people: null,
  valid_from: "",
  expires_at: "",
  status: "active",
};
