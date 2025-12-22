import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import * as z from "zod";

export const searchParamsCache = createSearchParamsCache({
  flags: parseAsStringEnum(["active", "inactive"]).withDefault("active"),
  page: parseAsInteger.withDefault(1),
  per_page: parseAsInteger.withDefault(30),
  sort: parseAsString.withDefault("created_at.desc"),
  search: parseAsString.withDefault(""),
  status: parseAsString.withDefault(""),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
});

export const getTransactionsSchema = z.object({
  page: z.coerce.number().default(1),
  per_page: z.coerce.number().default(30),
  sort: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
