import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { request } from "@/services/core/api-client";
import {
  ApiResponse,
  OnboardingApiResponse,
} from "@/services/vendor/onboarding/type";
import { OnboardingFormData } from "../../_components/form-provider/schema";
import { buildOnboardingStepsUrl } from "../onboarding-steps-url";

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
    const fetchSteps = async (previewIsRooms?: boolean) =>
      request<ApiResponse>({
        url: buildOnboardingStepsUrl(locationId, previewIsRooms),
        method: "GET",
        headers,
        returnFullResponse: true,
      });

    const savedResponse = await fetchSteps();
    const response = savedResponse.status
      ? savedResponse
      : await (async () => {
          const roomsPreview = await fetchSteps(true);
          return roomsPreview.status ? roomsPreview : fetchSteps(false);
        })();

    if (response.status) {
      if (!response.data) {
        return {
          status: true,
          message: "Success but no data",
          data: {} as OnboardingApiResponse,
        };
      }
      const data = response.data as unknown as OnboardingFormData;

      return {
        status: true,
        message: response.message || "Success",
        data: data as unknown as OnboardingApiResponse,
      };
    }

    return null;
  } catch (err: unknown) {
    console.log("Error fetching onboarding data:", err);
    return null;
  }
}
