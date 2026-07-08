import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
} from "nuqs/server";

export const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  per_page: parseAsInteger.withDefault(30),
  status: parseAsString.withDefault("active"),
  from_date: parseAsString.withDefault(""),
  to_date: parseAsString.withDefault(""),
  category_id: parseAsString.withDefault(""),
  room_id: parseAsString.withDefault(""),
});
