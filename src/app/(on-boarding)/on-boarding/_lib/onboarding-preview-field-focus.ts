"use client";

import { useEffect } from "react";
import { useFormContext } from "../_components/form-provider";

/** Opens the matching guided block when the site preview requests a form field. */
export function useOnboardingPreviewFieldFocus(
  stepNumber: number,
  focusGuidedSection: (sectionId: string) => void,
) {
  const { formFieldFocusRequest, activeStep } = useFormContext();

  useEffect(() => {
    const sectionId = formFieldFocusRequest?.guidedSectionId?.trim();
    if (!sectionId || activeStep !== stepNumber) return;
    focusGuidedSection(sectionId);
  }, [formFieldFocusRequest, activeStep, stepNumber, focusGuidedSection]);
}
