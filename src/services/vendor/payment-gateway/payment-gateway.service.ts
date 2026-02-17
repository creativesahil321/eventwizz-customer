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
   * Payload: { payment_gateway, source, replace_id (optional) }
   * @param gateway Payment gateway to connect
   * @param source Where the connection is initiated from ("settings" or "onboarding")
   * @param replaceId Optional ID of existing account to replace
   */
  connectPaymentGateway: async (
    gateway: "truelayer" | "stripe" | "paypal" | "worldpay" | "klarna",
    source: "settings" | "onboarding" = "settings",
    replaceId?: number
  ): Promise<{
    status: boolean;
    message: string;
    data?: {
      status?: string;
      charges_enabled?: boolean;
      payouts_enabled?: boolean;
      connection_status?: string;
      details_submitted?: boolean;
      stripe_account_id?: string;
      onboarding_url?: string;
      auth_url?: string;
      account_id?: string;
      gateway: string;
      return_url?: string;
      refresh_url?: string;
    };
    errors: string[];
  }> => {
    try {
      const payload: {
        payment_gateway: string;
        source: string;
        replace_id?: number;
      } = {
        payment_gateway: gateway,
        source,
      };
      if (replaceId != null) payload.replace_id = replaceId;

      const response = await api.post<{
        status: boolean;
        message: string;
        data?: {
          status?: string;
          charges_enabled?: boolean;
          payouts_enabled?: boolean;
          connection_status?: string;
          details_submitted?: boolean;
          stripe_account_id?: string;
          onboarding_url?: string;
          auth_url?: string;
          account_id?: string;
          gateway: string;
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
   * @param gateway Payment gateway name
   * @param accountId The stripe_account_id or merchant_id returned from connect
   */
  handlePaymentGatewayReturn: async (
    gateway: "stripe" | "paypal" | "truelayer" | "worldpay" | "klarna",
    accountId: string
  ): Promise<{
    status: boolean;
    message: string;
    data?: {
      status?: string;
      charges_enabled?: boolean;
      payouts_enabled?: boolean;
      connection_status?: string;
      details_submitted?: boolean;
      stripe_account_id?: string;
      account_id?: string;
      merchant_id?: string;
      connected?: boolean;
      gateway?: string;
    };
    errors?: string[];
  }> => {
    try {
      const url = API_ENDPOINTS.VENDOR.PAYMENT_GATEWAYS.RETURN_URL.replace(
        "{gateway}",
        gateway
      ).replace("{account_id}", encodeURIComponent(accountId));

      const response = await api.get<{
        status: boolean;
        message: string;
        data?: {
          status?: string;
          charges_enabled?: boolean;
          payouts_enabled?: boolean;
          connection_status?: string;
          details_submitted?: boolean;
          stripe_account_id?: string;
          account_id?: string;
          merchant_id?: string;
          connected?: boolean;
          gateway?: string;
        };
        errors?: string[];
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
