import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
} from "nuqs/server";

export const adminDashboardSearchParamsCache = createSearchParamsCache({
  period: parseAsString.withDefault("monthly"),
  from_date: parseAsString.withDefault(""),
  to_date: parseAsString.withDefault(""),
  sales_period: parseAsString.withDefault("monthly"),
  customer_page: parseAsInteger.withDefault(1),
  customer_per_page: parseAsInteger.withDefault(10),
  customer_search: parseAsString.withDefault(""),
  newly_added_page: parseAsInteger.withDefault(1),
  newly_added_per_page: parseAsInteger.withDefault(10),
  newly_added_search: parseAsString.withDefault(""),
  venues_limit: parseAsInteger.withDefault(5),
});
