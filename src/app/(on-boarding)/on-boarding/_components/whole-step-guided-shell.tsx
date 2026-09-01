"use client";

import { useMemo, type ReactNode } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import {
  GuidedSectionActionFooter,
  GuidedWholeStepApproveButton,
} from "./guided-sticky-approval-bar";
import { useGuidedOnboardingSections } from "../_lib/hooks/use-guided-onboarding-sections";
import type { GuidedSectionConfig } from "../_lib/hooks/use-guided-onboarding-sections";
import { useOnboardingPreviewFieldFocus } from "../_lib/onboarding-preview-field-focus";
import { guidedSectionSurfaceClass } from "./guided-section-surface";
import { GuidedSectionTitleBar } from "./guided-section-title-bar";

export type GuidedContext<T extends FieldValues> = ReturnType<
  typeof useGuidedOnboardingSections<T>
>;

export type WholeStepGuidedFooterProps<T extends FieldValues> = {
  guided: GuidedContext<T>;
  sectionId: string;
};

type Props<T extends FieldValues> = {
  form: UseFormReturn<T>;
  sectionId?: string;
  chipLabel: string;
  chipDescription: string;
  children: (guided: GuidedContext<T>) => ReactNode;
  /** Replaces the default footer (approve-only). Use for Save & Next / Skip alongside approve. */
  renderFooter?: (props: WholeStepGuidedFooterProps<T>) => ReactNode;
  /**
   * Approve without running full `form.trigger()` (e.g. payment step: schema requires a gateway until skip/save).
   * Save/submit still validates via `handleSubmit` / `trigger`.
   */
  lenientApproval?: boolean;
  /** From FormProvider after persistence GET merged. */
  persistenceHydrated?: boolean;
  /** From global `stepN.isApproved` when API already marked this step approved. */
  persistedStepApproved?: boolean;
  /** When set, preview clicks unlock this whole-step guided shell. */
  previewFocusStep?: number;
};

/**
 * Single-section guided pattern for long steps (5–11): validate on approve + gate continue.
 */
export function WholeStepGuidedShell<T extends FieldValues>({
  form,
  sectionId = "review-all",
  chipLabel,
  chipDescription,
  children,
  renderFooter,
  lenientApproval = false,
  persistenceHydrated = false,
  persistedStepApproved = false,
  previewFocusStep,
}: Props<T>) {
  const sectionConfigs = useMemo((): GuidedSectionConfig<T>[] => {
    return [
      {
        id: sectionId,
        label: chipLabel,
        description: chipDescription,
        fields: [],
        validate: lenientApproval
          ? async () => true
          : async () => form.trigger(undefined, { shouldFocus: true }),
      },
    ];
  }, [form, sectionId, chipLabel, chipDescription, lenientApproval]);

  const guided = useGuidedOnboardingSections({
    form,
    sections: sectionConfigs,
    resolveErrorSectionIndex: () => 0,
    skipFullFormTriggerOnApproveAll: lenientApproval,
    persistenceHydrated,
    persistedStepApproved,
  });

  useOnboardingPreviewFieldFocus(
    previewFocusStep ?? -1,
    guided.focusGuidedSection,
  );

  return (
    <>
      <section
        data-guided-section={sectionId}
        tabIndex={-1}
        className={guidedSectionSurfaceClass(true, "overflow-hidden p-0")}
      >
        <div className="space-y-4 p-4 sm:p-5">
          <GuidedSectionTitleBar
            sectionIndex={0}
            sectionId={sectionId}
            guided={guided}
            title={chipLabel}
          />
          <fieldset
            disabled={guided.currentSectionIndex !== 0}
            className={
              guided.currentSectionIndex !== 0
                ? "min-w-0 border-0 p-0 pointer-events-none"
                : "min-w-0 border-0 p-0"
            }
          >
            {children(guided)}
          </fieldset>
          <GuidedSectionActionFooter
            isActive
            sectionLabel={chipLabel}
            sectionProgress="1 / 1"
          >
            {renderFooter ? (
              renderFooter({ guided, sectionId })
            ) : (
              <GuidedWholeStepApproveButton
                guided={guided}
                sectionId={sectionId}
              />
            )}
          </GuidedSectionActionFooter>
        </div>
      </section>
    </>
  );
}
