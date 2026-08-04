import { z } from "zod";

export const discountFormSchema = z
  .object({
    name: z.string().optional().nullable(),
    category: z.enum(["event_specific", "date_wise", "coupon_code"]),
    location_ids: z.array(z.number()).min(1, "Select at least one location"),
    event_ids: z.array(z.number()).min(1, "Select at least one event"),
    /** Event-scoped rooms: `${eventId}:${roomId}` — same venue room can differ per event */
    room_keys: z.array(z.string()).default([]),
    /** Unique date row ids from locations-with-events (room.dates[].id) */
    applicable_date_ids: z.array(z.number()).default([]),
    coupon_code: z.string().optional().nullable(),
    customer_audience: z.enum(["all_active", "selected"]).default("all_active"),
    customer_ids: z.array(z.number()).default([]),
    value_type: z.enum(["percentage", "flat"]),
    discount_value: z.coerce.number().positive("Enter a discount value"),
    flat_mode: z.enum(["on_total", "per_person"]).optional().nullable(),
    min_people: z.coerce.number().optional().nullable(),
    valid_from: z.string().optional().nullable(),
    expires_at: z.string().min(1, "Expiry date is required"),
    status: z.enum(["active", "inactive"]),
  })
  .superRefine((data, ctx) => {
    if (data.category === "date_wise") {
      if (!data.room_keys?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select at least one room / hall",
          path: ["room_keys"],
        });
      }
      if (!data.applicable_date_ids?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select at least one date",
          path: ["applicable_date_ids"],
        });
      }
    }

    if (data.category === "coupon_code") {
      const code = data.coupon_code?.trim() ?? "";
      if (!code) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a coupon code",
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
          message: "Select at least one customer",
          path: ["customer_ids"],
        });
      }
    }

    if (data.value_type === "percentage" && data.discount_value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentage cannot exceed 100",
        path: ["discount_value"],
      });
    }

    if (data.value_type === "flat") {
      if (!data.flat_mode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select flat discount mode",
          path: ["flat_mode"],
        });
      }
      if (
        data.flat_mode === "per_person" &&
        (!data.min_people || data.min_people < 1)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Minimum people required",
          path: ["min_people"],
        });
      }
    }
  });

export type DiscountFormValues = z.infer<typeof discountFormSchema>;

export const defaultDiscountFormValues: DiscountFormValues = {
  name: "",
  category: "event_specific",
  location_ids: [],
  event_ids: [],
  room_keys: [],
  applicable_date_ids: [],
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
