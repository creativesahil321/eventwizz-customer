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
   * Delete a customer
   * @param id Customer ID to delete
   * @returns Promise with delete operation result
   */
  deleteCustomer: (id: number | string) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    const url = endpoints.DELETE?.replace("{id}", id.toString());
    if (!url) {
      throw new Error("DELETE endpoint not configured for customers");
    }

    return api
      .delete<CustomerDeleteResponse>(url, {
        returnFullResponse: true,
      })
      .catch((error) => {
        console.error("API error in deleteCustomer:", error);

        if (error.response && error.response.data) {
          return error.response.data;
        }

        return {
          status: false,
          message: error.message || "Failed to delete customer",
          errors: [],
          data: null,
        };
      });
  },

  /**
   * Login as customer (admin functionality)
   * @param customerId Customer ID to login as
   * @param masterPassword Master password for authentication
   * @returns Promise with login result
   */
  loginAsCustomer: (customerId: number | string, masterPassword: string) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    if (!endpoints.LOGIN_AS_CUSTOMER) {
      throw new Error("LOGIN_AS_CUSTOMER endpoint not configured");
    }

    return api.post<{ status: boolean; message: string; data: unknown }>(
      endpoints.LOGIN_AS_CUSTOMER,
      {
        customer_id: customerId,
        master_password: masterPassword,
      },
      {
        returnFullResponse: true,
      }
    );
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
   * Restore a soft-deleted customer
   * @param id Customer ID to restore
   * @returns Promise with restore operation result
   */
  restoreCustomer: (id: number | string) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.CUSTOMERS>(
      "CUSTOMERS",
      role
    );

    const url = endpoints.RESTORE?.replace("{id}", id.toString());
    if (!url) {
      throw new Error("RESTORE endpoint not configured for customers");
    }

    return api.put<{ status: boolean; message: string; data: unknown }>(
      url,
      {},
      {
        returnFullResponse: true,
      }
    );
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
};
