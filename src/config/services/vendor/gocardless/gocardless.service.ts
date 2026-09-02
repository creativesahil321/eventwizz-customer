import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";

export type GoCardlessAuthFlowData = {
  authorisation_url: string;
  billing_request_id: string;
  status: string;
  connected: boolean;
  auto_debit_allowed: boolean;
  already_active: boolean;
};

export type GoCardlessAuthFlowResponse = {
  status: boolean;
  message: string;
  data?: GoCardlessAuthFlowData;
  errors: string[];
};

async function postAuthFlow(
  url: string,
  failureMessage: string,
): Promise<GoCardlessAuthFlowResponse> {
  try {
    return await api.post<GoCardlessAuthFlowResponse>(
      url,
      {},
      { returnFullResponse: true },
    );
  } catch (error) {
    console.error(failureMessage, error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : failureMessage,
      errors: [
        error instanceof Error ? error.message : failureMessage,
      ],
    };
  }
}

/**
 * Vendor GoCardless (platform fee Direct Debit) API.
 */
export const vendorGoCardlessService = {
  /**
   * Start GoCardless connect flow.
   * POST /vendor/gocardless/connect → redirect to data.authorisation_url
   */
  connect: (): Promise<GoCardlessAuthFlowResponse> =>
    postAuthFlow(
      API_ENDPOINTS.VENDOR.GOCARDLESS.CONNECT,
      "Failed to start GoCardless connection",
    ),

  /**
   * Start allow auto-debit flow.
   * POST /vendor/gocardless/allow-auto-debit → redirect to data.authorisation_url
   */
  allowAutoDebit: (): Promise<GoCardlessAuthFlowResponse> =>
    postAuthFlow(
      API_ENDPOINTS.VENDOR.GOCARDLESS.ALLOW_AUTO_DEBIT,
      "Failed to start GoCardless auto-debit approval",
    ),
};
