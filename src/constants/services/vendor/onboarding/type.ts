/**
 * Onboarding Service Type Definitions
 *
 * Contains service-specific types needed for the onboarding service.
 */

import {
  StepOneType,
  StepTwoType,
  StepThreeType,
  StepFourType,
  StepFiveType,
  StepSixType,
  StepSevenType,
  StepEightType,
  StepNineType,
  StepTenType,
  StepElevenType,
} from "@/app/(on-boarding)/on-boarding/_components/form-provider/schema";
import { OnboardingApiResponse as BaseOnboardingApiResponse } from "@/types/auth.types";

export interface ApiResponse {
  status?: boolean;
  message?: string;
  data?: OnboardingApiResponse;
  errors?: string[];
  isOnboarded?: boolean;
}

export type {
  StepOneType,
  StepTwoType,
  StepThreeType,
  StepFourType,
  StepFiveType,
  StepSixType,
  StepSevenType,
  StepEightType,
  StepNineType,
  StepTenType,
  StepElevenType,
};

export interface OnboardingApiResponse extends BaseOnboardingApiResponse {
  data?: {
    id?: number;
    slug?: string;
    status?: number;
    vendor_location_id?: number;
    last_completed_step?: number;
    on_boarding_step?: number;
    [key: string]: unknown;
  };
}
