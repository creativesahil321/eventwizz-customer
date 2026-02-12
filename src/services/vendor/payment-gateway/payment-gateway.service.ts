import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";

/** Single account for a gateway (vendor can have multiple accounts per gateway; only one active at a time) */
export interface PaymentGatewayAccount {
  id: number;
  account_status?: "pending" | "active" | "under_review" | "restricted";
  account_id?: string;
  is_enabled?: boolean;
  bank?: {
    bank_name?: string;
    account_masked?: string;
  };
}

/** Response shape for GET /vendor/payment-gateway - keyed by gateway name, value is array of accounts */
export interface PaymentGatewaysResponse {
  payment_gateways: Record<string, PaymentGatewayAccount[]>;
}

/**
 * Service for managing vendor payment gateways
 * Handles payment gateway connections and status retrieval
 */
export const vendorPaymentGatewayService = {
  /**
   * Get all payment gateways status for the current vendor
   */
  getPaymentGateways: async (): Promise<{
    status: boolean;
    message: string;
    data?: PaymentGatewaysResponse;
    errors: string[];
  }> => {
    try {
      const response = await api.get<{
        status: boolean;
        message: string;
        data?: PaymentGatewaysResponse;
        errors: string[];
      }>(API_ENDPOINTS.VENDOR.PAYMENT_GATEWAYS.GET_ALL, {
        returnFullResponse: true,
      });

      return response;
    } catch (error) {
      console.error("Get payment gateways error:", error);
      return {
        status: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch payment gateways",
        errors: [
          error instanceof Error
            ? error.message
            : "Failed to fetch payment gateways",
        ],
      };
    }
  },

  /**
   * Enable or disable a payment gateway account (only one active per gateway at a time).
   * @param accountId Payment gateway account id from GET all
   * @param isEnabled true to enable, false to disable
   */
  setPaymentGatewayEnabled: async (
    accountId: number,
    isEnabled: boolean
  ): Promise<{
    status: boolean;
    message: string;
    errors: string[];
  }> => {
    try {
      const url = API_ENDPOINTS.VENDOR.PAYMENT_GATEWAYS.ENABLE_DISABLE_PAYMENT_GATEWAY.replace(
        "{id}",
        String(accountId)
      );
      const response = await api.patch<{
        status: boolean;
        message: string;
        errors: string[];
      }>(url, { is_enabled: isEnabled }, { returnFullResponse: true });
      return response;
    } catch (error) {
      console.error("Enable/disable payment gateway error:", error);
      return {
        status: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update payment gateway",
        errors: [
          error instanceof Error
            ? error.message
            : "Failed to update payment gateway",
        ],
      };
    }
  },

  /**
   * Connect a payment gateway (initiates OAuth/onboarding).
   * POST /vendor/payment-gateway/connect
   * Payload: { payment_gateway } and optionally { replace_id } when replacing an existing account.
   * For a new account, omit replace_id.
   */
  connectPaymentGateway: async (
    gateway: "truelayer" | "stripe" | "paypal" | "worldpay" | "klarna",
    replaceId?: number
  ): Promise<{
    status: boolean;
    message: string;
    data?: {
      onboarding_url?: string;
      auth_url?: string;
      account_id?: string;
      gateway: string;
      connection_status?: string;
      return_url?: string;
      refresh_url?: string;
    };
    errors: string[];
  }> => {
    try {
      const payload: { payment_gateway: string; replace_id?: number } = {
        payment_gateway: gateway,
      };
      if (replaceId != null) payload.replace_id = replaceId;

      const response = await api.post<{
        status: boolean;
        message: string;
        data?: {
          onboarding_url?: string;
          auth_url?: string;
          account_id?: string;
          gateway: string;
          connection_status?: string;
          return_url?: string;
          refresh_url?: string;
        };
        errors: string[];
      }>(API_ENDPOINTS.VENDOR.PAYMENT_GATEWAYS.CONNECT_PAYMENT_GATEWAY, payload, {
        returnFullResponse: true,
      });

      return response;
    } catch (error) {
      console.error("Payment gateway connection error:", error);
      return {
        status: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to connect payment gateway",
        errors: [
          error instanceof Error
            ? error.message
            : "Failed to connect payment gateway",
        ],
      };
    }
  },

  /**
   * Delete a payment gateway account.
   * DELETE /vendor/payment-gateway/{id}
   * @param accountId Payment gateway account id from GET all
   */
  deletePaymentGateway: async (
    accountId: number
  ): Promise<{
    status: boolean;
    message: string;
    errors: string[];
  }> => {
    try {
      const url =
        API_ENDPOINTS.VENDOR.PAYMENT_GATEWAYS.DELETE_PAYMENT_GATEWAY.replace(
          "{id}",
          String(accountId)
        );
      const response = await api.delete<{
        status: boolean;
        message: string;
        errors: string[];
      }>(url, { returnFullResponse: true });
      return response;
    } catch (error) {
      console.error("Delete payment gateway error:", error);
      return {
        status: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete payment gateway",
        errors: [
          error instanceof Error
            ? error.message
            : "Failed to delete payment gateway",
        ],
      };
    }
  },

  /**
   * Handle payment gateway return after OAuth/authorization.
   * Calls GET /vendor/payment-gateway/return/{gateway}?account={account_id}
   * (and any other query params from the provider redirect).
   * @param gateway Payment gateway name
   * @param returnParams Params from the return URL (e.g. account, account_id from Stripe/PayPal)
   */
  handlePaymentGatewayReturn: async (
    gateway: "stripe" | "paypal" | "truelayer" | "worldpay" | "klarna",
    returnParams?: Record<string, string>
  ): Promise<{
    success?: boolean;
    status?: boolean;
    message: string;
    gateway?: string;
    account_status?: string;
    account_data?: {
      account_id?: string;
      charges_enabled?: boolean;
      payouts_enabled?: boolean;
      details_submitted?: boolean;
    };
    errors?: string[];
  }> => {
    try {
      const accountId =
        returnParams?.account ?? returnParams?.account_id ?? "";
      const url = API_ENDPOINTS.VENDOR.PAYMENT_GATEWAYS.RETURN_URL.replace(
        "{gateway}",
        gateway
      )
        .replace("{account_id}", encodeURIComponent(accountId));

      const response = await api.get<{
        status: boolean;
        message: string;
        data?: {
          account_id?: string;
          merchant_id?: string;
          connected: boolean;
          gateway: string;
        };
        errors: string[];
      }>(url, {
        returnFullResponse: true,
      });

      return response;
    } catch (error) {
      console.error(`${gateway} return handling error:`, error);
      return {
        status: false,
        message:
          error instanceof Error
            ? error.message
            : `Failed to process ${gateway} return`,
        errors: [
          error instanceof Error
            ? error.message
            : `Failed to process ${gateway} return`,
        ],
      };
    }
  },

  /**
   * Disconnect a payment gateway
   * @param gateway Payment gateway to disconnect
   */
  disconnectPaymentGateway: async (
    gateway: "truelayer" | "stripe" | "paypal" | "worldpay" | "klarna"
  ): Promise<{
    status: boolean;
    message: string;
    errors: string[];
  }> => {
    try {
      const response = await api.delete<{
        status: boolean;
        message: string;
        errors: string[];
      }>(`${API_ENDPOINTS.VENDOR.PAYMENT_GATEWAYS.DISCONNECT}/${gateway}`, {
        returnFullResponse: true,
      });

      return response;
    } catch (error) {
      console.error("Payment gateway disconnection error:", error);
      return {
        status: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to disconnect payment gateway",
        errors: [
          error instanceof Error
            ? error.message
            : "Failed to disconnect payment gateway",
        ],
      };
    }
  },
};
