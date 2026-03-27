"use client";

import { useMemo, type ReactNode } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import {
  GuidedSectionActionFooter,
  GuidedWholeStepApproveButton,
} from "./guided-sticky-approval-bar";
import { useGuidedOnboardingSections } from "../_lib/hooks/use-guided-onboarding-sections";
import type { GuidedSectionConfig } from "../_lib/hooks/use-guided-onboarding-sections";
import { guidedSectionSurfaceClass } from "./guided-section-surface";

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
  });

  return (
    <>
      <section
        data-guided-section={sectionId}
        tabIndex={-1}
        className={guidedSectionSurfaceClass(true, "overflow-hidden p-0")}
      >
        <div className="p-5 sm:p-6 space-y-6">
          {children(guided)}
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
