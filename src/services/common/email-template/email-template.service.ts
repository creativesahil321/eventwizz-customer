import { ApiResponse, request } from "@/services/core/api-client";
import { EmailTemplate, EmailTemplateUpdateRequest } from "./type";

import {
  getCurrentUserRole,
  getEndpointsByRole,
} from "@/lib/utils/api-endpoints";

type EmailTemplateEndpoints = {
  GET_ALL: string;
  GET_BY_ID: string;
  UPDATE: string;
};

/**
 * Service for interacting with email templates API
 * Handles role-specific API endpoints for admin and vendor
 */
export const emailTemplateService = {
  /**
   * Get a list of email templates for the specified role
   * @param params - Optional pagination parameters
   * @returns Promise with the email templates list
   */
  async getTemplates(params?: {
    page?: number;
    per_page?: number;
    search?: string;
  }): Promise<{ data: EmailTemplate[] }> {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<EmailTemplateEndpoints>(
      "EMAIL_TEMPLATES",
      role
    );

    // Add pagination parameters to the request
    const queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.per_page) queryParams.per_page = String(params.per_page);
    if (params?.search) queryParams.search = params.search;

    const response = await request<ApiResponse<{ data: EmailTemplate[] }>>({
      url: endpoints.GET_ALL,
      method: "GET",
      params: queryParams,
    });

    return response.data;
  },

  /**
   * Get an email template by ID
   * @param id - The email template ID
   * @returns Promise with the email template
   */
  async getTemplateById(id: number | string): Promise<EmailTemplate> {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<EmailTemplateEndpoints>(
      "EMAIL_TEMPLATES",
      role
    );

    const url = endpoints.GET_BY_ID.replace("{id}", id.toString());

    // Specify proper types with ApiResponse to avoid using 'any'
    const response = await request<ApiResponse<EmailTemplate>>({
      url: url,
      method: "GET",
      returnFullResponse: true, // Get the full API response
    });

    // Handle the complete API response structure with deeply nested data
    if (response) {
      // If we have a response.data.data structure (nested data object)
      if (response.data && typeof response.data === "object") {
        return response.data;
      }

      // If we have { status, message, data } structure
      if (response.status && response.data) {
        return response.data;
      }

      // Just return the response as is if nothing else works
      return response as unknown as EmailTemplate;
    }

    throw new Error("Failed to retrieve template data");
  },

  /**
   * Update an existing email template
   * @param id - The email template ID
   * @param template - The updated email template data
   * @returns Promise with the updated email template
   */
  async updateTemplate(
    id: number | string,
    template: EmailTemplateUpdateRequest
  ): Promise<EmailTemplate> {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<EmailTemplateEndpoints>(
      "EMAIL_TEMPLATES",
      role
    );

    const url = endpoints.UPDATE.replace("{id}", id.toString());
    const response = await request<ApiResponse<EmailTemplate>>({
      url: url,
      method: "POST",
      data: template,
    });

    return response.data;
  },
};
