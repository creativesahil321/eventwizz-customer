"use client";

import { FormProvider } from "./_components/form-provider";
import FormLayoutProvider from "./_components/form-layout";
import { OnboardingFormSkeleton } from "@/components/ui/onboarding-skeleton";
import { useOnboardingData } from "./_lib/hooks/useOnboardingData";
import { ApiResponse } from "@/services/vendor/onboarding/type";

export default function OnboardingClientWrapper() {
  const { onboardingData, isLoading } = useOnboardingData();

  if (isLoading) {
    return <OnboardingFormSkeleton layout="full" />;
  }

  // Handle the case where onboardingData might be undefined
  const safeData: ApiResponse | null = onboardingData || null;

  return (
    <FormProvider serverData={safeData}>
      <FormLayoutProvider />
    </FormProvider>
  );
}
