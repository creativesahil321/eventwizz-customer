import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import {
  CustomersResponse,
  CustomerResponse,
  CustomerCreatePayload,
  CustomerUpdatePayload,
  CustomerCreateResponse,
  CustomerUpdateResponse,
  CustomerDeleteResponse,
  CustomerDeletePayload,
  CustomerSendDeleteOtpPayload,
  CustomerSendDeleteOtpResponse,
  CustomerVerifyDeleteOtpPayload,
  CustomerVerifyDeleteOtpResponse,
  CustomerBulkDeletePayload,
} from "./types";
import {
  getCurrentUserRole,
  getEndpointsByRole,
} from "@/lib/utils/api-endpoints";

/**
 * Customers Service
 * Handles API calls related to vendor customers management
 */
export const customersService = {
  /**
   * Fetch all customers with optional search parameters
   * @param params Search parameters (page, per_page, search, status)
   * @returns Promise with customers data
   */
  getCustomers: (params?: {
    search?: string;
    page?: number | string;
    per_page?: number | string;
    status?: string;
  }) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    return api.get<CustomersResponse>(endpoints.GET_ALL, {
      params,
      returnFullResponse: true,
    });
  },

  /**
   * Fetch a specific customer by ID
   * @param id Customer ID
   * @returns Promise with customer data
   */
  getCustomerById: (id: number | string) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    const url = endpoints.GET_BY_ID?.replace("{id}", id.toString());
    if (!url) {
      throw new Error("GET_BY_ID endpoint not configured for customers");
    }

    return api.get<CustomerResponse>(url, {
      returnFullResponse: true,
    });
  },

  /**
   * Create a new customer
   * @param data Customer data
   * @returns Promise with created customer data
   */
  createCustomer: (data: CustomerCreatePayload) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    if (!endpoints.CREATE) {
      throw new Error("CREATE endpoint not configured for customers");
    }

    return api.post<CustomerCreateResponse>(endpoints.CREATE, data, {
      returnFullResponse: true,
    });
  },

  /**
   * Update an existing customer
   * @param id Customer ID
   * @param data Customer data to update
   * @returns Promise with updated customer data
   */
  updateCustomer: (id: number | string, data: CustomerUpdatePayload) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    const url = endpoints.UPDATE?.replace("{id}", id.toString());
    if (!url) {
      throw new Error("UPDATE endpoint not configured for customers");
    }

    return api.put<CustomerUpdateResponse>(url, data, {
      returnFullResponse: true,
    });
  },

  /**
   * Email a delete OTP to the vendor owner (never staff).
   * POST /vendor/customers/send-delete-otp
   */
  sendDeleteOtp: (payload: CustomerSendDeleteOtpPayload) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    if (!endpoints.SEND_DELETE_OTP) {
      throw new Error("SEND_DELETE_OTP endpoint not configured for customers");
    }

    return api.post<CustomerSendDeleteOtpResponse>(
      endpoints.SEND_DELETE_OTP,
      payload,
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Verify the delete OTP before unlocking the confirmation phrase.
   * POST /vendor/customers/verify-delete-otp
   */
  verifyDeleteOtp: (payload: CustomerVerifyDeleteOtpPayload) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    if (!endpoints.VERIFY_DELETE_OTP) {
      throw new Error(
        "VERIFY_DELETE_OTP endpoint not configured for customers"
      );
    }

    return api.post<CustomerVerifyDeleteOtpResponse>(
      endpoints.VERIFY_DELETE_OTP,
      payload,
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Soft-delete a customer after OTP + typed confirmation phrase.
   * DELETE /vendor/customers/delete/{id}
   * Body: { otp, confirmation: "delete this customer" }
   */
  deleteCustomer: (id: number | string, payload: CustomerDeletePayload) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    const url = endpoints.DELETE?.replace("{id}", id.toString());
    if (!url) {
      throw new Error("DELETE endpoint not configured for customers");
    }

    return api.delete<CustomerDeleteResponse>(url, {
      data: payload,
      returnFullResponse: true,
    });
  },

  /**
   * Send email to customer
   * @param customerId Customer ID
   * @param emailData Email data
   * @returns Promise with email send result
   */
  sendEmailToCustomer: (
    customerId: number | string,
    emailData: {
      subject: string;
      message: string;
      attachments?: File[];
    }
  ) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    if (!endpoints.SEND_MAIL) {
      throw new Error("SEND_MAIL endpoint not configured for customers");
    }

    // If there are attachments, use FormData
    if (emailData.attachments && emailData.attachments.length > 0) {
      const formData = new FormData();
      formData.append("customer_id", customerId.toString());
      formData.append("subject", emailData.subject);
      formData.append("message", emailData.message);

      emailData.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });

      return api.post<{ status: boolean; message: string; data: unknown }>(
        endpoints.SEND_MAIL,
        formData,
        {
          returnFullResponse: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
    }

    // Regular JSON request for emails without attachments
    return api.post<{ status: boolean; message: string; data: unknown }>(
      endpoints.SEND_MAIL,
      {
        customer_id: customerId,
        subject: emailData.subject,
        message: emailData.message,
      },
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Send bulk email to all customers
   * @param emailData Bulk email data with attachments
   * @returns Promise with bulk email send result
   */
  sendBulkEmailToAllCustomers: (emailData: {
    subject: string;
    body: string;
    attachments?: File[];
  }) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    if (!endpoints.SEND_BULK_MAIL) {
      throw new Error("SEND_BULK_MAIL endpoint not configured for customers");
    }

    // If there are attachments, use FormData
    if (emailData.attachments && emailData.attachments.length > 0) {
      const formData = new FormData();
      formData.append("subject", emailData.subject);
      formData.append("body", emailData.body);

      emailData.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });

      return api.post<{ status: boolean; message: string; data: unknown }>(
        endpoints.SEND_BULK_MAIL,
        formData,
        {
          returnFullResponse: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
    }

    // Regular JSON request for emails without attachments
    return api.post<{ status: boolean; message: string; data: unknown }>(
      endpoints.SEND_BULK_MAIL,
      {
        subject: emailData.subject,
        body: emailData.body,
      },
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Export customers as CSV (optionally filtered by search/status)
   */
  exportCustomersCSV: (params?: {
    search?: string;
    status?: string;
  }): Promise<Blob> => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    if (!endpoints.EXPORT_CSV) {
      throw new Error("EXPORT_CSV endpoint not configured for customers");
    }

    return api.get<Blob>(endpoints.EXPORT_CSV, {
      params,
      responseType: "blob",
      headers: { Accept: "text/csv" },
    });
  },

  /**
   * Permanently delete a customer
   * @param id Customer ID to permanently delete
   * @returns Promise with permanent delete operation result
   */
  permanentDeleteCustomer: (id: number | string) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    const url = endpoints.PERMANENT_DELETE?.replace("{id}", id.toString());
    if (!url) {
      throw new Error("PERMANENT_DELETE endpoint not configured for customers");
    }

    return api.delete<{ status: boolean; message: string; data: unknown }>(
      url,
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Bulk activate customers
   * @param customerIds Array of customer IDs to activate
   * @returns Promise with bulk activate operation result
   */
  bulkActivateCustomers: (customerIds: (number | string)[]) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    if (!endpoints.MULTIPLE_ACTIONS?.BULK_ACTIVATE) {
      throw new Error("BULK_ACTIVATE endpoint not configured for customers");
    }

    // Format payload as FormData with array notation: customer_ids[0]:36, customer_ids[1]:5, etc.
    const formData = new FormData();
    customerIds.forEach((id, index) => {
      formData.append(`customer_ids[${index}]`, id.toString());
    });

    return api.post<{ status: boolean; message: string; data: unknown }>(
      endpoints.MULTIPLE_ACTIONS.BULK_ACTIVATE,
      formData,
      {
        returnFullResponse: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
  },

  /**
   * Bulk deactivate customers
   * @param customerIds Array of customer IDs to deactivate
   * @returns Promise with bulk deactivate operation result
   */
  bulkDeactivateCustomers: (customerIds: (number | string)[]) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    if (!endpoints.MULTIPLE_ACTIONS?.BULK_DEACTIVATE) {
      throw new Error("BULK_DEACTIVATE endpoint not configured for customers");
    }

    // Format payload as FormData with array notation: customer_ids[0]:36, customer_ids[1]:5, etc.
    const formData = new FormData();
    customerIds.forEach((id, index) => {
      formData.append(`customer_ids[${index}]`, id.toString());
    });

    return api.post<{ status: boolean; message: string; data: unknown }>(
      endpoints.MULTIPLE_ACTIONS.BULK_DEACTIVATE,
      formData,
      {
        returnFullResponse: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
  },

  /**
   * Bulk soft-delete customers after OTP + typed confirmation phrase.
   * POST /vendor/customers/bulk-delete
   * Body: { customer_ids, otp, confirmation: "delete this customer" }
   */
  bulkDeleteCustomers: (payload: CustomerBulkDeletePayload) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    if (!endpoints.MULTIPLE_ACTIONS?.BULK_DELETE) {
      throw new Error("BULK_DELETE endpoint not configured for customers");
    }

    return api.post<{ status: boolean; message: string; data: unknown }>(
      endpoints.MULTIPLE_ACTIONS.BULK_DELETE,
      payload,
      {
        returnFullResponse: true,
      }
    );
  },
};
