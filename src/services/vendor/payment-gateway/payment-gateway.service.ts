import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import {
  bankTransferFieldErrors,
  buildBankTransferConnectBody,
  readBankTransferFailure,
  type BankTransferConnectInput,
  type BankTransferConnectResult,
} from "@/services/vendor/payment-gateway/bank-transfer";

/** Single account for a gateway (vendor can have multiple accounts per gateway; only one active at a time) */
export interface PaymentGatewayAccount {
  id: number;
  account_status?: "pending" | "active" | "under_review" | "restricted";
  account_id?: string;
  /** Masked publishable / client key (credentials connect) */
  key?: string;
  client_secret?: string;
  is_enabled?: boolean;
  webhook_url?: string | null;
  manual_webhook?: boolean;
  public_key?: string | null;
  bank?: {
    bank_name?: string;
    account_masked?: string;
  };
}

export type PaymentGatewayCanAdd = {
  stripe?: boolean;
  paypal?: boolean;
  stripe_bank?: boolean;
};

/** Response shape for GET /vendor/payment-gateway - keyed by gateway name, value is array of accounts */
export interface PaymentGatewaysResponse {
  payment_gateways: Record<string, PaymentGatewayAccount[]>;
  can_add?: PaymentGatewayCanAdd;
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
    data?: {
      id: number;
      gateway: string;
      is_enabled: boolean;
    };
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
        data?: {
          id: number;
          gateway: string;
          is_enabled: boolean;
        };
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
   * Connect a payment gateway via POST /vendor/onboarding/payment-gateway-connect.
   * Stripe / PayPal require credentials `{ key, secret }`.
   */
  connectPaymentGateway: async (
    gateway: "stripe" | "paypal" | "worldpay" | "klarna",
    credentials: { key: string; secret: string },
  ): Promise<{
    status: boolean;
    message: string;
    data?: {
      gateway: string;
      account?: {
        id: number;
        account_status?: "pending" | "active" | "under_review" | "restricted";
        is_enabled?: boolean;
        key?: string;
        client_secret?: string;
        account_id?: string;
      };
      webhook_url?: string | null;
      manual_webhook?: boolean;
      webhook_setup_hint?: string | null;
      public_key?: string | null;
      verification?: {
        stripe_account_verified_at?: string | null;
        paypal_oauth_verified_at?: string | null;
        charges_enabled?: boolean;
        payouts_enabled?: boolean;
        manual_webhook?: boolean;
        signing_key_generated?: boolean;
      };
      account_id?: string;
      connection_status?: string;
    };
    errors: string[] | Record<string, string[]>;
  }> => {
    try {
      const payload = {
        payment_gateway: gateway,
        credentials: {
          key: credentials.key.trim(),
          secret: credentials.secret.trim(),
        },
      };

      const response = await api.post<{
        status: boolean;
        message: string;
        data?: {
          gateway: string;
          account?: {
            id: number;
            account_status?:
              | "pending"
              | "active"
              | "under_review"
              | "restricted";
            is_enabled?: boolean;
            key?: string;
            client_secret?: string;
            account_id?: string;
          };
          webhook_url?: string | null;
          manual_webhook?: boolean;
          webhook_setup_hint?: string | null;
          public_key?: string | null;
          verification?: {
            stripe_account_verified_at?: string | null;
            paypal_oauth_verified_at?: string | null;
            charges_enabled?: boolean;
            payouts_enabled?: boolean;
            manual_webhook?: boolean;
            signing_key_generated?: boolean;
          };
          account_id?: string;
          connection_status?: string;
        };
        errors: string[] | Record<string, string[]>;
      }>(API_ENDPOINTS.VENDOR.ONBOARDING.PAYMENT_GATEWAYS, payload, {
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
    gateway: "stripe" | "paypal" | "worldpay" | "klarna",
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
  connectBankTransfer: async (
    input: BankTransferConnectInput,
  ): Promise<BankTransferConnectResult> => {
    const url =
      input.scope === "onboarding"
        ? API_ENDPOINTS.VENDOR.ONBOARDING.PAYMENT_GATEWAYS
        : API_ENDPOINTS.VENDOR.PAYMENT_GATEWAYS.CONNECT;
    try {
      const response = await api.post<{
        status: boolean;
        message: string;
        errors?: unknown;
        data?: { account?: BankTransferConnectResult["account"] };
      }>(url, buildBankTransferConnectBody(input), {
        returnFullResponse: true,
        suppressErrorToast: true,
      });
      return {
        status: response.status,
        message: response.message ?? "",
        fieldErrors: response.status
          ? {}
          : bankTransferFieldErrors(response.errors),
        account: response.data?.account,
      };
    } catch (error) {
      return { status: false, ...readBankTransferFailure(error) };
    }
  },

  deleteOnboardingPaymentGateway: async (
    accountId: number,
  ): Promise<{ status: boolean; message: string }> => {
    try {
      const url = API_ENDPOINTS.VENDOR.ONBOARDING.DELETE_PAYMENT_GATEWAY.replace(
        "{id}",
        String(accountId),
      );
      return await api.delete<{ status: boolean; message: string }>(url, {
        returnFullResponse: true,
      });
    } catch (error) {
      return {
        status: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to remove bank transfer",
      };
    }
  },

  disconnectPaymentGateway: async (
    gateway: "stripe" | "paypal" | "worldpay" | "klarna"
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
