"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

export type GuidedSectionConfig<T extends FieldValues> = {
  id: string;
  label: string;
  description: string;
  /** Fields validated when approving this section */
  fields: Path<T>[];
  /** Extra checks (e.g. image OR video required) */
  validate?: () => boolean | Promise<boolean>;
};

type Options<T extends FieldValues> = {
  form: UseFormReturn<T>;
  sections: GuidedSectionConfig<T>[];
  /** Map RHF error keys to section index after full form trigger fails */
  resolveErrorSectionIndex: (errorKeys: string[]) => number;
  /** When set, used for “approve all” instead of `form.trigger()` only (e.g. required files). */
  validateFullStep?: () => boolean | Promise<boolean>;
  /**
   * When true, “Validate & approve all” skips `form.trigger()` and approves every section.
   * Use when the step schema intentionally fails until optional actions (e.g. connect payment).
   * Save/submit handlers should still run full validation.
   */
  skipFullFormTriggerOnApproveAll?: boolean;
  /** True after onboarding GET merged into the form (avoid seeding before persistence is loaded). */
  persistenceHydrated?: boolean;
  /** From API `stepN.isApproved` — treat all guided sections as already approved. */
  persistedStepApproved?: boolean;
};

export function useGuidedOnboardingSections<T extends FieldValues>({
  form,
  sections,
  resolveErrorSectionIndex,
  validateFullStep,
  skipFullFormTriggerOnApproveAll,
  persistenceHydrated = false,
  persistedStepApproved = false,
}: Options<T>) {
  const sectionFlow = useMemo(() => sections, [sections]);

  const [approvedSections, setApprovedSections] = useState<Set<string>>(
    () => new Set(),
  );
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  const sectionIdsKey = useMemo(
    () => sectionFlow.map((s) => s.id).join("\0"),
    [sectionFlow],
  );

  useEffect(() => {
    if (!persistenceHydrated || !persistedStepApproved) return;
    if (sectionFlow.length === 0) return;
    setApprovedSections(new Set(sectionFlow.map((s) => s.id)));
    setCurrentSectionIndex(Math.max(0, sectionFlow.length - 1));
  }, [
    persistenceHydrated,
    persistedStepApproved,
    sectionIdsKey,
    sectionFlow.length,
  ]);

  const currentSection = sectionFlow[currentSectionIndex];
  const allSectionsApproved =
    sectionFlow.length > 0 &&
    approvedSections.size === sectionFlow.length;

  const canNavigateToIndex = useCallback(
    (index: number) => {
      for (let j = 0; j < index; j++) {
        if (!approvedSections.has(sectionFlow[j].id)) return false;
      }
      return true;
    },
    [approvedSections, sectionFlow],
  );

  useEffect(() => {
    if (!currentSection) return;
    const root = document.querySelector(
      `[data-guided-section="${currentSection.id}"]`,
    );
    if (!(root instanceof HTMLElement)) return;
    root.scrollIntoView({ block: "nearest", behavior: "smooth" });

    const focusFirstField = () => {
      const focusable = root.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]',
      );
      if (focusable) {
        try {
          focusable.focus({ preventScroll: true });
        } catch {
          focusable.focus();
        }
        return;
      }
      try {
        root.focus({ preventScroll: true });
      } catch {
        root.focus();
      }
    };

    let raf = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    raf = requestAnimationFrame(() => {
      timeoutId = setTimeout(focusFirstField, 0);
    });
    return () => {
      cancelAnimationFrame(raf);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentSection]);

  const validateCurrentSection = useCallback(async () => {
    if (!currentSection) return false;
    if (currentSection.validate) {
      const extra = await Promise.resolve(currentSection.validate());
      if (!extra) return false;
    }
    if (currentSection.fields.length === 0) return true;
    return form.trigger(
      currentSection.fields as Path<T>[],
      { shouldFocus: true },
    );
  }, [currentSection, form]);

  const handleApproveSection = useCallback(async () => {
    const ok = await validateCurrentSection();
    if (!ok || !currentSection) return;
    setApprovedSections((prev) => new Set(prev).add(currentSection.id));
    if (currentSectionIndex < sectionFlow.length - 1) {
      setCurrentSectionIndex((i) => i + 1);
    }
  }, [
    validateCurrentSection,
    currentSection,
    currentSectionIndex,
    sectionFlow.length,
  ]);

  const handleApproveAllSections = useCallback(async (): Promise<boolean> => {
    const goToLastSection = () => {
      setCurrentSectionIndex(Math.max(0, sectionFlow.length - 1));
    };

    if (skipFullFormTriggerOnApproveAll) {
      const extraOk = validateFullStep
        ? await Promise.resolve(validateFullStep())
        : true;
      if (extraOk) {
        setApprovedSections(new Set(sectionFlow.map((s) => s.id)));
        goToLastSection();
        return true;
      }
      const idx = resolveErrorSectionIndex(["__extra_validation__"]);
      setCurrentSectionIndex(
        Math.max(0, Math.min(idx, sectionFlow.length - 1)),
      );
      return false;
    }

    const schemaOk = await form.trigger(undefined, { shouldFocus: true });
    const extraOk = validateFullStep
      ? await Promise.resolve(validateFullStep())
      : true;
    if (schemaOk && extraOk) {
      setApprovedSections(new Set(sectionFlow.map((s) => s.id)));
      goToLastSection();
      return true;
    }
    if (schemaOk && !extraOk) {
      const idx = resolveErrorSectionIndex(["__extra_validation__"]);
      setCurrentSectionIndex(
        Math.max(0, Math.min(idx, sectionFlow.length - 1)),
      );
      return false;
    }
    const errorKeys = Object.keys(form.formState.errors);
    const idx = resolveErrorSectionIndex(errorKeys);
    setCurrentSectionIndex(
      Math.max(0, Math.min(idx, sectionFlow.length - 1)),
    );
    return false;
  }, [
    form,
    sectionFlow,
    resolveErrorSectionIndex,
    validateFullStep,
    skipFullFormTriggerOnApproveAll,
  ]);

  /** Re-open a completed section: clears approval for this section and all following ones, then focuses it. */
  const handleUnlockSection = useCallback(
    (index: number) => {
      const section = sectionFlow[index];
      if (!section) return;
      setApprovedSections((prev) => {
        const next = new Set(prev);
        for (let i = index; i < sectionFlow.length; i++) {
          next.delete(sectionFlow[i].id);
        }
        return next;
      });
      setCurrentSectionIndex(index);
    },
    [sectionFlow],
  );

  const handleChipClick = useCallback(
    async (index: number) => {
      const section = sectionFlow[index];
      if (!section) return;

      const approved = approvedSections.has(section.id);
      const reachable = canNavigateToIndex(index);

      if (!reachable && !approved) return;

      if (index === currentSectionIndex && !approved) {
        await handleApproveSection();
        return;
      }

      setCurrentSectionIndex(index);
    },
    [
      sectionFlow,
      approvedSections,
      canNavigateToIndex,
      currentSectionIndex,
      handleApproveSection,
    ],
  );

  const isSectionActive = useCallback(
    (index: number) => index === currentSectionIndex,
    [currentSectionIndex],
  );

  const isChipInteractive = useCallback(
    (index: number) => {
      const section = sectionFlow[index];
      if (!section) return false;
      if (approvedSections.has(section.id)) return true;
      if (index === currentSectionIndex) return true;
      return canNavigateToIndex(index);
    },
    [sectionFlow, approvedSections, currentSectionIndex, canNavigateToIndex],
  );

  return {
    sectionFlow,
    currentSectionIndex,
    currentSection,
    approvedSections,
    allSectionsApproved,
    isSectionActive,
    isChipInteractive,
    handleApproveSection,
    handleApproveAllSections,
    handleChipClick,
    handleUnlockSection,
  };
}
