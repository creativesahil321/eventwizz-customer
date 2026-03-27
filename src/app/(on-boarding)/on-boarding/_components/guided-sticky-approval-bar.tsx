"use client";

import { Children, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Minimal slice of guided state needed for approve / next actions */
export type GuidedActionsSlice = {
  currentSection: { id: string } | undefined;
  currentSectionIndex: number;
  sectionFlow: readonly { id: string }[];
  approvedSections: Set<string>;
  handleApproveSection: () => void | Promise<void>;
  handleChipClick: (index: number) => void;
};

type StickyBarProps = {
  sectionTitle: string;
  /** e.g. "2 / 3" */
  sectionProgress?: string;
  children: ReactNode;
  className?: string;
};

/** Match whole-step footers (steps 5–11) for Approve / Save & Next / Skip */
export const guidedOnboardingApproveStepButtonClass =
  "shrink-0 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10";
export const guidedOnboardingSaveNextButtonClass =
  "shrink-0 rounded-full px-8 py-2 text-white";
export const guidedOnboardingSkipButtonClass =
  "shrink-0 rounded-full border-white/10 bg-transparent px-6 py-2 text-slate-400 hover:border-white/20 hover:bg-white/5 hover:text-slate-200";
export const guidedOnboardingNextSectionButtonClass =
  "shrink-0 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10";

type SectionFooterProps = {
  /** Only render when this section is the current one — keeps actions scoped and avoids duplicate controls. */
  isActive: boolean;
  /** Ignored when {@link hideSectionMeta} is true */
  sectionLabel?: string;
  sectionProgress?: string;
  children: ReactNode;
  className?: string;
  /** Center the action row (default true; matches steps 5–11). */
  centeredActions?: boolean;
  /** Hide section title / n-of-m row (use when step chips were removed). */
  hideSectionMeta?: boolean;
};

/**
 * Inline actions at the bottom of the active guided section (non-sticky).
 * Common pattern: pair with {@link GuidedSectionCoreActions} and optional Save / Skip.
 */
export function GuidedSectionActionFooter({
  isActive,
  sectionLabel = "",
  sectionProgress,
  children,
  className,
  centeredActions = true,
  hideSectionMeta = false,
}: SectionFooterProps) {
  if (!isActive) return null;
  const actionRow = Children.toArray(children).filter(
    (c) => c != null && typeof c !== "boolean",
  );
  if (actionRow.length === 0) return null;
  return (
    <div
      className={cn(
        "mt-6 border-t border-white/[0.08] pt-5",
        className,
      )}
    >
      {!hideSectionMeta && (sectionLabel || sectionProgress) ? (
        <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
          {sectionLabel ? (
            <p className="text-xs font-medium text-slate-300">{sectionLabel}</p>
          ) : (
            <span />
          )}
          {sectionProgress ? (
            <span className="shrink-0 text-[11px] text-slate-500 tabular-nums">
              {sectionProgress}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn(
          centeredActions
            ? "flex w-full min-w-0 flex-row flex-wrap items-center justify-center gap-3"
            : "flex max-w-full flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]",
        )}
      >
        {actionRow}
      </div>
    </div>
  );
}

/**
 * Sticks to the top of the sidebar scroll viewport so approval actions stay visible
 * while users work through long sections (split-layout onboarding).
 * @deprecated Prefer {@link GuidedSectionActionFooter} inside each section for a cleaner layout.
 */
export function GuidedStickyApprovalBar({
  sectionTitle,
  sectionProgress,
  children,
  className,
}: StickyBarProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 mb-3 px-3 py-3",
        "border-b border-white/[0.08] bg-slate-950",
        "supports-[backdrop-filter]:bg-slate-950/95 supports-[backdrop-filter]:backdrop-blur-sm",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.06)]",
        "isolate",
        className,
      )}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            Reviewing
          </p>
          {sectionProgress ? (
            <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
              {sectionProgress}
            </span>
          ) : null}
        </div>
        <p
          className="text-sm font-medium text-slate-100 leading-snug line-clamp-2"
          title={sectionTitle}
        >
          {sectionTitle}
        </p>
        <div className="flex max-w-full flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 sm:gap-2.5 [scrollbar-width:thin]">
          {children}
        </div>
      </div>
    </div>
  );
}

type CoreActionsProps = {
  guided: GuidedActionsSlice;
};

/** Whole-step shell: omit once approved; Save & Next stay in the step footer. */
export function GuidedWholeStepApproveButton({
  guided,
  sectionId,
}: {
  guided: Pick<GuidedActionsSlice, "approvedSections" | "handleApproveSection">;
  sectionId: string;
}) {
  if (guided.approvedSections.has(sectionId)) return null;
  return (
    <Button
      type="button"
      variant="event-outline"
      className={guidedOnboardingApproveStepButtonClass}
      onClick={() => void guided.handleApproveSection()}
    >
      Approve step
    </Button>
  );
}

/** Approve step + Next section — same styling as whole-step Approve (outline). */
export function GuidedSectionCoreActions({ guided }: CoreActionsProps) {
  const allSectionsApproved =
    guided.sectionFlow.length > 0 &&
    guided.sectionFlow.every((s) => guided.approvedSections.has(s.id));

  if (allSectionsApproved) return null;

  const approved =
    !!guided.currentSection &&
    guided.approvedSections.has(guided.currentSection.id);

  return (
    <div className="inline-flex max-w-full flex-none flex-row flex-nowrap items-center gap-3">
      <Button
        type="button"
        variant="event-outline"
        className={guidedOnboardingApproveStepButtonClass}
        disabled={
          !guided.currentSection ||
          (!!guided.currentSection &&
            guided.approvedSections.has(guided.currentSection.id))
        }
        onClick={() => void guided.handleApproveSection()}
      >
        {approved ? "Step approved" : "Approve step"}
      </Button>
      {guided.currentSectionIndex < guided.sectionFlow.length - 1 &&
        guided.currentSection &&
        guided.approvedSections.has(guided.currentSection.id) && (
          <Button
            type="button"
            variant="event-outline"
            className={guidedOnboardingNextSectionButtonClass}
            onClick={() =>
              guided.handleChipClick(guided.currentSectionIndex + 1)
            }
          >
            Next section
          </Button>
        )}
    </div>
  );
}
