import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type {
  AdminPlatformCommissionResponse,
  AdminPlatformCommissionUpdatePayload,
} from "./types";

export const adminPaymentCommissionService = {
  get: async (): Promise<AdminPlatformCommissionResponse> => {
    return api.get<AdminPlatformCommissionResponse>(
      API_ENDPOINTS.ADMIN.PAYMENT_SETTINGS.GET_COMMISSION,
      { returnFullResponse: true },
    );
  },

  update: async (
    payload: AdminPlatformCommissionUpdatePayload,
  ): Promise<AdminPlatformCommissionResponse> => {
    return api.put<AdminPlatformCommissionResponse>(
      API_ENDPOINTS.ADMIN.PAYMENT_SETTINGS.UPDATE_COMMISSION,
      payload,
      { returnFullResponse: true },
    );
  },
};
