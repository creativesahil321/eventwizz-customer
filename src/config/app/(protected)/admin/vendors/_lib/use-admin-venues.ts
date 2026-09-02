import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { adminVenuesService } from "@/services/admin/venues/venues.service";
import type {
  AdminVenueItem,
  AdminVenueListStatus,
} from "@/services/admin/venues/type";
import type { Vendor } from "../_components/vendors-table";

export const adminVenuesKeys = {
  all: ["admin-venues"] as const,
  list: (params: { status?: string; search?: string; page?: number }) =>
    [...adminVenuesKeys.all, "list", params] as const,
};

function mapVenue(item: AdminVenueItem): Vendor {
  const normalizedDomainStatus = item.domain_status?.toLowerCase();
  const normalizedVendorStatus = item.status?.toLowerCase();
  const status =
    normalizedDomainStatus === "active" || normalizedVendorStatus === "active"
      ? "active"
      : "inactive";
  return {
    id: item.id,
    image: item.logo || "",
    name: item.venue_name,
    address: item.address || "",
    status,
    liveEvents: item.live_events ?? 0,
    totalEvents: item.total_events ?? 0,
    totalEarnings: item.total_earnings_raw ?? 0,
    adminCommission: item.admin_commission_raw ?? 0,
    commissionPending: item.commission_pending_raw ?? 0,
    netPayout: item.net_payout_raw ?? 0,
  };
}

export interface UseAdminVenuesParams {
  status?: AdminVenueListStatus;
  search?: string;
  page?: number;
  per_page?: number;
}

/**
 * Fetches admin venues list from API. Returns data mapped to Vendor table shape.
 */
export function useAdminVenues(params: UseAdminVenuesParams = {}) {
  const {
    status = "all",
    search = "",
    page = 1,
    per_page = 30,
  } = params;

  const query = useQuery({
    queryKey: adminVenuesKeys.list({ status, search, page }),
    queryFn: async () => {
      const response = await adminVenuesService.getVenues({
        status,
        search: search || undefined,
        page,
        per_page,
      });
      return {
        data: response.data.map(mapVenue),
        totalVenues: response.total_venues ?? response.meta?.total ?? 0,
        meta: response.meta,
        links: response.links,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data?.data ?? [],
    totalVenues: query.data?.totalVenues ?? 0,
    meta: query.data?.meta,
    links: query.data?.links,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
