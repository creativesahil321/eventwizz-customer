import { ApiResponse, EmailTemplate as UIEmailTemplate } from "./types";
import { emailTemplateService } from "@/services/common/email-template";

export const fetchEmailTemplates = async (params?: {
  page?: number;
  per_page?: number;
  search?: string;
}) => {
  try {
    // Use the centralized email template service with pagination params
    const response = await emailTemplateService.getTemplates(params);

    // Return response in the expected format
    return response;
  } catch (error) {
    console.error("Error fetching email templates:", error);
    // Return empty response with consistent structure
    return {
      data: {
        data: [],
        meta: {
          current_page: params?.page || 1,
          from: 1,
          last_page: 1,
          path: "",
          per_page: params?.per_page || 10,
          to: 0,
          total: 0,
        },
        links: {
          first: "",
          last: "",
          prev: null,
          next: null,
        },
      },
    };
  }
};

export const fetchEmailTemplateById = async (
  id: number
): Promise<ApiResponse<UIEmailTemplate>> => {
  try {
    // Use the centralized email template service
    const serviceTemplate = await emailTemplateService.getTemplateById(id);

    // Convert service template to UI template format
    const uiTemplate: UIEmailTemplate = {
      id: serviceTemplate.id,
      title: serviceTemplate.name || "",
      who_received: "User", // Default value - to be updated based on API
      when_received: serviceTemplate.subject || "",
      status: "Active", // Default value - to be updated based on API
    };

    // Convert to expected response format
    return {
      status: true,
      message: "Success",
      data: uiTemplate,
      errors: [],
    };
  } catch (error) {
    console.error("Error fetching email template details:", error);
    throw error;
  }
};

export const updateEmailTemplateById = async (
  id: number,
  data: {
    title?: string;
    subject?: string;
    body?: string;
  }
): Promise<ApiResponse<UIEmailTemplate>> => {
  try {
    // Convert UI data format to service format
    const serviceData = {
      name: data.title,
      subject: data.subject,
      body: data.body,
    };

    // Use the centralized email template service
    const serviceTemplate = await emailTemplateService.updateTemplate(
      id,
      serviceData
    );

    // Convert service template to UI template format
    const uiTemplate: UIEmailTemplate = {
      id: serviceTemplate.id,
      title: serviceTemplate.name || "",
      who_received: "User", // Default value - to be updated based on API
      when_received: serviceTemplate.subject || "",
      status: "Active", // Default value - to be updated based on API
    };

    // Convert to expected response format
    return {
      status: true,
      message: "Template updated successfully",
      data: uiTemplate,
      errors: [],
    };
  } catch (error) {
    console.error("Error updating email template:", error);
    throw error;
  }
};
