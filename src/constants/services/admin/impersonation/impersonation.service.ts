/**
 * Admin impersonation service — handles vendor impersonation API calls.
 */

import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type {
  ImpersonateVendorResponse,
  ExitImpersonationResponse,
} from "./types";

export const impersonationService = {
  /**
   * Start impersonating a vendor.
   * Backend validates admin role/permissions, creates an impersonation token,
   * and returns a full vendor session payload.
   */
  startImpersonation: async (
    vendorId: number
  ): Promise<ImpersonateVendorResponse> => {
    const url = API_ENDPOINTS.ADMIN.IMPERSONATION.START;
    return api.post<ImpersonateVendorResponse>(
      url,
      { vendor_id: vendorId },
      { returnFullResponse: true }
    );
  },

  /**
   * Notify backend that impersonation session has ended.
   * Backend logs the exit event and invalidates the impersonation token.
   */
  exitImpersonation: async (): Promise<ExitImpersonationResponse> => {
    const url = API_ENDPOINTS.ADMIN.IMPERSONATION.EXIT;
    return api.post<ExitImpersonationResponse>(
      url,
      {},
      { returnFullResponse: true }
    );
  },
};
