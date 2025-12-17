import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { request } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import {
  ApiResponse,
  OnboardingApiResponse,
} from "@/services/vendor/onboarding/type";
import { OnboardingFormData } from "../../_components/form-provider/schema";

export async function getServerOnboardingData(): Promise<ApiResponse | null> {
  const session = await getServerSession(authOptions);
  const token = session?.user?.token;
  const locationId = session?.user?.vendor_location_id;

  if (!token || !locationId) {
    return null;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "X-Venue-Location-Id": String(locationId),
  };

  try {
    // Log the full URL that will be used
    const endpoint = API_ENDPOINTS.VENDOR.ONBOARDING.GET_ALL_STEPS.replace(
      "{location_id}",
      String(locationId)
    );
    console.log(`Fetching onboarding data with endpoint: ${endpoint}`);

    // Call the API directly with the correct endpoint
    const response = await request<ApiResponse>({
      url: endpoint,
      method: "GET",
      headers,
      returnFullResponse: true,
    });

    console.log("Onboarding API response status:", response.status);

    // If successful, process and return the data
    if (response.status) {
      if (!response.data) {
        return {
          status: true,
          message: "Success but no data",
          data: {} as OnboardingApiResponse,
        };
      }
      const data = response.data as unknown as OnboardingFormData;

      // Ensure the data property exists and has proper structure for the form
      return {
        status: true,
        message: response.message || "Success",
        data: data as unknown as OnboardingApiResponse,
      };
    }

    return null;
  } catch (err: unknown) {
    console.log("Error fetching onboarding data:", err);
    // Return null on error
    return null;
  }
}
