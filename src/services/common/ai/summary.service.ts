import { toast } from "sonner";
import { GenerateSummaryOptions, SummaryResponse } from "./type";
import {
  getCurrentUserRole,
  getEndpointsByRole,
} from "@/lib/utils/api-endpoints";

type SummaryEndpoints = {
  GENERATE: string;
};

/**
 * Generate event summary using AI
 *
 * Note: This service uses fetch() directly instead of api-client because
 * AI endpoints are dynamically determined by user role. Manual toast
 * notifications are required here since the API client interceptor
 * only handles requests made through the api-client.
 */
export async function generateEventSummary(
  options: GenerateSummaryOptions
): Promise<SummaryResponse> {
  try {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<SummaryEndpoints>("AI", role);
    // Add style parameter for professional content
    const requestOptions = {
      ...options,
      style: "professional",
      tone: "business",
    };

    const response = await fetch(endpoints.GENERATE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestOptions),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error || "Failed to generate summary";
      toast.error(errorMessage);
      return { summary: null, isLoading: false, error: errorMessage };
    }

    toast.success("Summary generated successfully!");
    return { summary: data.summary, isLoading: false, error: null };
  } catch (error) {
    const errorMessage = "Failed to generate summary. Please try again later.";
    console.error("Error generating summary:", error);
    toast.error(errorMessage);
    return { summary: null, isLoading: false, error: errorMessage };
  }
}
