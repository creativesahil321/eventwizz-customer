import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";

export const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  per_page: parseAsInteger.withDefault(20),
  category: parseAsString.withDefault(""),
  read: parseAsStringEnum(["true", "false"]).withDefault("false"),
  sort: parseAsStringEnum([
    "timestamp.asc",
    "timestamp.desc",
    "priority.asc",
    "priority.desc",
  ]).withDefault("timestamp.desc"),
});
