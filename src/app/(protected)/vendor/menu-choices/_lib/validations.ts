import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
} from "nuqs/server";

export const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  per_page: parseAsInteger.withDefault(30),
  event_type: parseAsString.withDefault(""),
  menu_name: parseAsString.withDefault(""),
  status: parseAsString.withDefault(""),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
});
