import { z } from "zod";
import { getContactNumberIssue } from "@/lib/contact-number";

/** Hard cap on venue locations a vendor can create. */
export const MAX_VENDOR_LOCATIONS = 6;

// Schema for search params
export const searchParamsCache = z.object({
  page: z.string().optional(),
  per_page: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  sort: z.string().optional(),
  order: z.string().optional(),
});

// Schema for location creation/update form validation
export const locationSchema = z.object({
  name: z.string().optional(), // Set from venue (create) or location (update)
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  email: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z.union([
        z.literal(""),
        z.string().email("Invalid email format"),
      ]),
    ),
  contact_number: z.string().superRefine((value, ctx) => {
    const message = getContactNumberIssue(value);
    if (message) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }
  }),
  slug: z.string().optional(),
  is_default: z.boolean().default(false),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type LocationFormValues = z.infer<typeof locationSchema>;

// Schema for API response
export const locationResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  city: z.string(),
  address: z.string().optional(),
  email: z.string().optional(),
  contact_number: z.string().optional(),
  slug: z.string(),
  logo: z.string().optional(),
  cover_image: z.string().optional(),
  is_default: z.boolean(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type LocationResponse = z.infer<typeof locationResponseSchema>;

// Schema for pagination response
export const paginationSchema = z.object({
  current_page: z.number(),
  from: z.number().nullable(),
  last_page: z.number(),
  links: z.array(
    z.object({
      url: z.string().nullable(),
      label: z.string(),
      active: z.boolean(),
    })
  ),
  path: z.string(),
  per_page: z.number(),
  to: z.number().nullable(),
  total: z.number(),
});

// Schema for locations list API response
export const locationsListSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: z.object({
    data: z.array(locationResponseSchema),
    meta: paginationSchema.optional(),
  }),
});

// Schema for single location API response
export const locationDetailSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: locationResponseSchema,
});

// Type definitions
export type SearchParams = z.infer<typeof searchParamsCache>;
export type PaginationResponse = z.infer<typeof paginationSchema>;
export type LocationsListResponse = z.infer<typeof locationsListSchema>;
export type LocationDetailResponse = z.infer<typeof locationDetailSchema>;
