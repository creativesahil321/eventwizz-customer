import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { discountsService } from "@/services/vendor/discounts/discounts.service";
import type {
  DiscountFormPayload,
  DiscountStoreResponse,
  DiscountsQueryParams,
} from "./types";

export const discountKeys = {
  all: ["vendor-discounts"] as const,
  lists: () => [...discountKeys.all, "list"] as const,
  list: (filters: DiscountsQueryParams) =>
    [...discountKeys.lists(), filters] as const,
  details: () => [...discountKeys.all, "detail"] as const,
  detail: (id: number | string) => [...discountKeys.details(), id] as const,
  locationsWithEvents: () =>
    [...discountKeys.all, "locations-with-events"] as const,
};

export function useDiscounts(params: DiscountsQueryParams) {
  return useQuery({
    queryKey: discountKeys.list(params),
    queryFn: () => discountsService.getDiscounts(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });
}

export function useDiscount(id: number | string, enabled = true) {
  return useQuery({
    queryKey: discountKeys.detail(id),
    queryFn: () => discountsService.getDiscountById(id),
    enabled: enabled && Boolean(id),
    staleTime: 1000 * 60,
  });
}

/** Locations + nested events for create/edit scope dropdowns */
export function useDiscountLocationsWithEvents() {
  return useQuery({
    queryKey: discountKeys.locationsWithEvents(),
    queryFn: () => discountsService.getLocationsWithEvents(),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

export function useCreateDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DiscountFormPayload) =>
      discountsService.createDiscount(payload) as Promise<DiscountStoreResponse>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountKeys.lists() });
    },
  });
}

export function useUpdateDiscountStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number;
      status: "active" | "inactive";
    }) => discountsService.updateDiscountStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountKeys.lists() });
    },
  });
}
