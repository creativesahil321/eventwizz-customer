"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

const GUIDED_INPUT_META_KEYS = new Set([
  "step",
  "isApproved",
  "event_id",
  "eventId",
  "vendor_location_id",
  "id",
  "room_id",
]);

function getPathValue(source: unknown, path: string): unknown {
  if (!path) return source;
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: unknown = source;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** True when a guided field has user-entered content (not empty defaults). */
export function fieldHasUserInput(value: unknown): boolean {
  if (value == null || value === "") return false;
  if (typeof value === "boolean") return false;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof File !== "undefined" && value instanceof File) {
    return value.size > 0;
  }
  if (Array.isArray(value)) return value.some(fieldHasUserInput);
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, nested]) => {
        if (GUIDED_INPUT_META_KEYS.has(key) || key.startsWith("remove_")) {
          return false;
        }
        return fieldHasUserInput(nested);
      },
    );
  }
  return false;
}

/**
 * After `form.trigger()` commits `aria-invalid` / error-message paragraphs to the
 * DOM, scroll the first offending field into the visible sidebar area.
 *
 * We use `requestAnimationFrame` so React has already painted the error state
 * before we query the DOM. `scrollIntoView` works with ANY overflow container
 * (including shadcn ScrollArea) — unlike `element.focus()` which only scrolls
 * the document viewport.
 */
function scrollToFirstError(): void {
  requestAnimationFrame(() => {
    // 1. Native inputs / components that forward aria-invalid (most fields)
    let target = document.querySelector<HTMLElement>('[aria-invalid="true"]');

    if (!target) {
      // 2. Custom components (file-uploader, address autocomplete, …) that don't
      //    propagate aria-invalid: find the first non-empty FormMessage paragraph.
      //    FormMessage renders <p class="…text-destructive…">; character counters
      //    use <span class="text-destructive"> so the `p` selector is safe.
      const paragraphs =
        document.querySelectorAll<HTMLElement>("p.text-destructive");
      for (const p of paragraphs) {
        if (p.textContent?.trim()) {
          target = p;
          break;
        }
      }
    }

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable =
        target.matches(
          'input, textarea, select, [contenteditable="true"], button',
        )
          ? target
          : target.querySelector<HTMLElement>(
              'input:not([type="hidden"]):not([type="file"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]',
            );
      if (focusable) {
        try {
          focusable.focus({ preventScroll: true });
        } catch {
          focusable.focus();
        }
      }
    }
  });
}

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
  // Start with the first section enabled while persistence is hydrating.
  // Initialising to -1 when an AI-approved step is loaded can leave the whole
  // form disabled before `approvedSections` has been populated.
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  const sectionIdsKey = useMemo(
    () => sectionFlow.map((s) => s.id).join("\0"),
    [sectionFlow],
  );

  useEffect(() => {
    if (!persistenceHydrated) return;
    if (sectionFlow.length === 0) return;

    if (persistedStepApproved) {
      setApprovedSections(new Set(sectionFlow.map((s) => s.id)));
      setCurrentSectionIndex(-1);
      return;
    }

    // If a previously approved step is reopened and persistence says it is
    // no longer approved, make the first section editable again.
    setApprovedSections(new Set());
    setCurrentSectionIndex(0);
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

  const formValues = form.watch();
  const currentSectionHasInput = useMemo(() => {
    if (allSectionsApproved) return true;
    if (!currentSection) return false;
    if (currentSection.fields.length === 0) return true;
    return currentSection.fields.some((path) =>
      fieldHasUserInput(getPathValue(formValues, String(path))),
    );
  }, [allSectionsApproved, currentSection, formValues]);

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
      // Skip hidden + file inputs (uploaders) so focus lands on real form fields.
      const focusable = root.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([type="file"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]',
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
      if (!extra) {
        scrollToFirstError();
        return false;
      }
    }
    if (currentSection.fields.length === 0) return true;
    const ok = await form.trigger(
      currentSection.fields as Path<T>[],
      { shouldFocus: true },
    );
    if (!ok) scrollToFirstError();
    return ok;
  }, [currentSection, form]);

  const handleApproveSection = useCallback(async () => {
    const ok = await validateCurrentSection();
    if (!ok || !currentSection) return;
    setApprovedSections((prev) => new Set(prev).add(currentSection.id));
    if (currentSectionIndex < sectionFlow.length - 1) {
      setCurrentSectionIndex((i) => i + 1);
    } else {
      setCurrentSectionIndex(-1);
    }
  }, [
    validateCurrentSection,
    currentSection,
    currentSectionIndex,
    sectionFlow.length,
  ]);

  const handleApproveAllSections = useCallback(async (): Promise<boolean> => {
    const goToLastSection = () => {
      setCurrentSectionIndex(-1);
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
      scrollToFirstError();
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
      scrollToFirstError();
      return false;
    }
    const errorKeys = Object.keys(form.formState.errors);
    const idx = resolveErrorSectionIndex(errorKeys);
    setCurrentSectionIndex(
      Math.max(0, Math.min(idx, sectionFlow.length - 1)),
    );
    scrollToFirstError();
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
      if (allSectionsApproved && currentSectionIndex === -1) return;

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
      allSectionsApproved,
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
      if (allSectionsApproved && currentSectionIndex === -1) return false;
      if (approvedSections.has(section.id)) return true;
      if (index === currentSectionIndex) return true;
      return canNavigateToIndex(index);
    },
    [
      sectionFlow,
      allSectionsApproved,
      approvedSections,
      currentSectionIndex,
      canNavigateToIndex,
    ],
  );

  const resetToFirstSection = useCallback(() => {
    setCurrentSectionIndex(0);
  }, []);

  /**
   * Clears in-session section approvals and returns to the first block.
   * Call when the scoped data changes (e.g. multi-room tab) so approvals from
   * another room do not leak into the active room.
   */
  const resetSectionProgress = useCallback(
    (options?: { reapplyPersistedApproved?: boolean }) => {
      setCurrentSectionIndex(0);
      if (
        options?.reapplyPersistedApproved &&
        persistedStepApproved &&
        sectionFlow.length > 0
      ) {
        setApprovedSections(new Set(sectionFlow.map((s) => s.id)));
        return;
      }
      setApprovedSections(new Set());
    },
    [persistedStepApproved, sectionFlow],
  );

  return {
    sectionFlow,
    currentSectionIndex,
    currentSection,
    approvedSections,
    allSectionsApproved,
    currentSectionHasInput,
    isSectionActive,
    isChipInteractive,
    handleApproveSection,
    handleApproveAllSections,
    handleChipClick,
    handleUnlockSection,
    resetToFirstSection,
    resetSectionProgress,
  };
}
