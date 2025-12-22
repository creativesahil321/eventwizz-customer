import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
} from "nuqs/server";

export const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  per_page: parseAsInteger.withDefault(30),
  search: parseAsString.withDefault(""),
});
