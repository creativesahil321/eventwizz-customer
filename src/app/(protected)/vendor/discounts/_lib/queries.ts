import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { discountsService } from "@/services/vendor/discounts/discounts.service";
import { useHeaderLocationId } from "@/hooks/use-header-location-id";
import type {
  DiscountFormPayload,
  DiscountStoreResponse,
  DiscountsQueryParams,
} from "./types";

/**
 * Every discount endpoint is scoped by the `x-venue-location-id` header, so
 * the header location is part of each key — switching venue then refetches
 * instead of reusing another venue's cache.
 */
export const discountKeys = {
  all: ["vendor-discounts"] as const,
  lists: () => [...discountKeys.all, "list"] as const,
  list: (locationId: number, filters: DiscountsQueryParams) =>
    [...discountKeys.lists(), locationId, filters] as const,
  details: () => [...discountKeys.all, "detail"] as const,
  detail: (locationId: number, id: number | string) =>
    [...discountKeys.details(), locationId, id] as const,
  eventsWithDates: (locationId?: number) =>
    [...discountKeys.all, "events-with-dates", locationId ?? 0] as const,
};

export function useDiscounts(params: DiscountsQueryParams) {
  const locationId = useHeaderLocationId();

  return useQuery({
    queryKey: discountKeys.list(locationId, params),
    queryFn: () => discountsService.getDiscounts(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });
}

export function useDiscount(id: number | string, enabled = true) {
  const locationId = useHeaderLocationId();

  return useQuery({
    queryKey: discountKeys.detail(locationId, id),
    queryFn: () => discountsService.getDiscountById(id),
    enabled: enabled && Boolean(id),
    staleTime: 1000 * 60,
  });
}

/** Events + dates/rooms for the current header location */
export function useDiscountEventsWithDates(locationId?: number) {
  return useQuery({
    queryKey: discountKeys.eventsWithDates(locationId),
    queryFn: () => discountsService.getEventsWithDates(),
    enabled: !locationId || locationId > 0,
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

export function useUpdateDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: DiscountFormPayload;
    }) => discountsService.updateDiscount(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: discountKeys.details() });
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

export function useDeleteDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => discountsService.deleteDiscount(id),
    onSuccess: (_response, deletedId) => {
      queryClient.invalidateQueries({ queryKey: discountKeys.lists() });
      queryClient.removeQueries({
        queryKey: discountKeys.details(),
        predicate: (query) => query.queryKey.includes(deletedId),
      });
    },
  });
}
