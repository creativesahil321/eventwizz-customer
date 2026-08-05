import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type {
  Discount,
  DiscountFormPayload,
  DiscountEventsWithDatesResponse,
  DiscountEventWithDates,
  DiscountStoreResponse,
  DiscountsListResponse,
  DiscountsPaginatedData,
  DiscountsQueryParams,
} from "@/app/(protected)/vendor/discounts/_lib/types";

type DiscountEndpoints = typeof API_ENDPOINTS.VENDOR.DISCOUNTS;

function getDiscountEndpoints(): DiscountEndpoints {
  return API_ENDPOINTS.VENDOR.DISCOUNTS;
}

function normalizeListPayload(
  response: DiscountsListResponse | DiscountsPaginatedData | Discount[]
): DiscountsPaginatedData {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    response.data &&
    typeof response.data === "object" &&
    !Array.isArray(response.data) &&
    "data" in response.data &&
    Array.isArray((response.data as DiscountsPaginatedData).data)
  ) {
    return response.data as DiscountsPaginatedData;
  }

  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    Array.isArray((response as DiscountsPaginatedData).data)
  ) {
    const page = response as DiscountsPaginatedData;
    return {
      data: page.data,
      links: page.links ?? { first: null, last: null, prev: null, next: null },
      meta: page.meta ?? {
        current_page: 1,
        from: page.data.length ? 1 : null,
        last_page: 1,
        per_page: page.data.length || 10,
        to: page.data.length || null,
        total: page.data.length,
      },
    };
  }

  if (Array.isArray(response)) {
    return {
      data: response,
      links: { first: null, last: null, prev: null, next: null },
      meta: {
        current_page: 1,
        from: response.length ? 1 : null,
        last_page: 1,
        per_page: response.length || 10,
        to: response.length || null,
        total: response.length,
      },
    };
  }

  return {
    data: [],
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: null,
      last_page: 1,
      per_page: 10,
      to: null,
      total: 0,
    },
  };
}

/**
 * Vendor Discounts Service
 */
export const discountsService = {
  getDiscounts: async (
    params?: DiscountsQueryParams
  ): Promise<DiscountsPaginatedData> => {
    const endpoints = getDiscountEndpoints();
    const response = await api.get<
      DiscountsListResponse | DiscountsPaginatedData | Discount[]
    >(endpoints.GET_ALL, {
      params,
      returnFullResponse: true,
    });
    return normalizeListPayload(response);
  },

  getDiscountById: async (id: number | string): Promise<Discount> => {
    const endpoints = getDiscountEndpoints();
    const url = endpoints.GET_BY_ID.replace("{id}", String(id));
    const response = await api.get<{ data: Discount } | Discount>(url, {
      returnFullResponse: true,
    });
    if (
      response &&
      typeof response === "object" &&
      "data" in response &&
      response.data &&
      typeof response.data === "object" &&
      "id" in (response.data as Discount)
    ) {
      return response.data as Discount;
    }
    return response as Discount;
  },

  /**
   * Events (with dates/rooms) for the current header location.
   * GET /vendor/discounts/locations-with-events
   */
  getEventsWithDates: async (): Promise<DiscountEventWithDates[]> => {
    const endpoints = getDiscountEndpoints();
    const response = await api.get<
      DiscountEventsWithDatesResponse | DiscountEventWithDates[]
    >(endpoints.EVENTS_WITH_DATES, {
      returnFullResponse: true,
    });

    if (Array.isArray(response)) return response;

    if (
      response &&
      typeof response === "object" &&
      "data" in response &&
      Array.isArray(response.data)
    ) {
      return response.data;
    }

    return [];
  },

  createDiscount: async (
    data: DiscountFormPayload
  ): Promise<DiscountStoreResponse> => {
    const endpoints = getDiscountEndpoints();
    const response = await api.post<DiscountStoreResponse>(
      endpoints.CREATE,
      data,
      { returnFullResponse: true }
    );
    return response as DiscountStoreResponse;
  },

  updateDiscount: (id: number | string, data: Partial<DiscountFormPayload>) => {
    const endpoints = getDiscountEndpoints();
    const url = endpoints.UPDATE.replace("{id}", String(id));
    return api.put(url, data, { returnFullResponse: true });
  },

  updateDiscountStatus: (
    id: number | string,
    status: "active" | "inactive"
  ) => {
    const endpoints = getDiscountEndpoints();
    const url = endpoints.UPDATE_STATUS.replace("{id}", String(id));
    return api.patch(url, { status }, { returnFullResponse: true });
  },

  deleteDiscount: (id: number | string) => {
    const endpoints = getDiscountEndpoints();
    const url = endpoints.DELETE.replace("{id}", String(id));
    return api.delete(url, { returnFullResponse: true });
  },
};
