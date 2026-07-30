import { z } from "zod";

export const discountFormSchema = z
  .object({
    name: z.string().optional().nullable(),
    category: z.enum(["event_specific", "date_wise", "coupon_code"]),
    location_id: z.coerce.number().min(1, "Select a location"),
    event_id: z.coerce.number().min(1, "Select an event"),
    room_id: z.coerce.number().optional().nullable(),
    applicable_dates: z.array(z.string()).default([]),
    coupon_code: z.string().optional().nullable(),
    value_type: z.enum(["percentage", "flat"]),
    discount_value: z.coerce.number().positive("Enter a discount value"),
    flat_mode: z
      .enum(["flat_on_total", "flat_per_person"])
      .optional()
      .nullable(),
    min_people: z.coerce.number().optional().nullable(),
    valid_from: z.string().optional().nullable(),
    expires_at: z.string().min(1, "Expiry date is required"),
    status: z.enum(["active", "inactive"]),
  })
  .superRefine((data, ctx) => {
    if (data.category === "date_wise") {
      if (!data.room_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select a room / hall",
          path: ["room_id"],
        });
      }
      if (!data.applicable_dates?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select at least one date",
          path: ["applicable_dates"],
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
        data.flat_mode === "flat_per_person" &&
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
  location_id: 0,
  event_id: 0,
  room_id: null,
  applicable_dates: [],
  coupon_code: "",
  value_type: "percentage",
  discount_value: 0,
  flat_mode: null,
  min_people: null,
  valid_from: "",
  expires_at: "",
  status: "active",
};
