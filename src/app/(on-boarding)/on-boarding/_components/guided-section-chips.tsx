"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { guidedOnboardingSaveNextButtonClass } from "./guided-sticky-approval-bar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type GuidedChipSection = {
  id: string;
  label: string;
  description: string;
};

type ChipsProps = {
  sections: GuidedChipSection[];
  currentSectionIndex: number;
  approvedSections: Set<string>;
  isChipInteractive: (index: number) => boolean;
  onChipClick: (index: number) => void;
};

export function GuidedSectionChips({
  sections,
  currentSectionIndex,
  approvedSections,
  isChipInteractive,
  onChipClick,
}: ChipsProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="mb-6 w-full">
        <div className="flex max-w-full flex-nowrap justify-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {sections.map((section, index) => {
            const isApproved = approvedSections.has(section.id);
            const isCurrent = index === currentSectionIndex;
            const interactive = isChipInteractive(index);

            return (
              <Tooltip key={section.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={!interactive}
                    onClick={() => void onChipClick(index)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary,#3b82f6)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                      isApproved &&
                        "border-emerald-500/50 bg-emerald-500/10 text-emerald-100",
                      !isApproved &&
                        isCurrent &&
                        interactive &&
                        "border-[var(--color-primary,#3b82f6)]/60 bg-white/10 text-white shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-primary,#3b82f6)_35%,transparent)]",
                      !isApproved &&
                        isCurrent &&
                        !interactive &&
                        "border-white/15 bg-white/5 text-slate-400",
                      !isApproved &&
                        !isCurrent &&
                        interactive &&
                        "border-white/20 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
                      !isApproved &&
                        !isCurrent &&
                        !interactive &&
                        "cursor-not-allowed border-white/10 bg-transparent text-slate-600 opacity-60",
                    )}
                  >
                    {isApproved ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[10px]">
                        {index + 1}
                      </span>
                    )}
                    <span className="max-w-[140px] truncate">
                      {section.label}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs border border-white/10 bg-slate-900 text-slate-100"
                >
                  <p className="font-medium">{section.label}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {section.description}
                  </p>
                  {isCurrent && !isApproved && interactive && (
                    <p className="mt-2 text-xs text-slate-500">
                      Click to validate and approve this section.
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

const guidedValidateApproveAllButtonClass =
  "rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10";

/** Validate-all control (used in footers or bottom blocks). */
export function GuidedValidateApproveAllButton({
  onApproveAll,
  className,
}: {
  onApproveAll: () => boolean | void | Promise<boolean | void>;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(guidedValidateApproveAllButtonClass, className)}
      onClick={() => void onApproveAll()}
    >
      Validate &amp; approve all
    </Button>
  );
}

export function GuidedApproveAllStatusMessage({
  allSectionsApproved,
}: {
  allSectionsApproved: boolean;
}) {
  if (!allSectionsApproved) {
    return (
      <span className="text-center text-xs text-slate-500">
        One button below checks every section, saves, and takes you forward.
      </span>
    );
  }
  return (
    <span className="text-center text-xs text-emerald-400/90">
      All sections approved — save and continue when you&apos;re ready.
    </span>
  );
}

/**
 * Multi-section steps (1–4): single primary control — validate & approve (if needed), then save + next.
 */
export function GuidedMultiSectionBottomActions({
  onApproveAll,
  allSectionsApproved,
  onContinue,
  loading = false,
  continueDisabled = false,
  hasInput = true,
  labelWhenReady,
  extraActions,
  className,
}: {
  onApproveAll: () => boolean | Promise<boolean>;
  allSectionsApproved: boolean;
  onContinue: () => void | Promise<void>;
  loading?: boolean;
  continueDisabled?: boolean;
  /** Hide approve/continue until the current section has user-entered content. */
  hasInput?: boolean;
  labelWhenReady?: string;
  extraActions?: ReactNode;
  className?: string;
}) {
  const [approving, setApproving] = useState(false);
  const busy = loading || approving;
  const showPrimary = allSectionsApproved || hasInput;

  const handlePrimaryClick = async () => {
    if (busy || continueDisabled) return;
    if (!allSectionsApproved) {
      setApproving(true);
      try {
        const ok = await onApproveAll();
        if (!ok) return;
      } finally {
        setApproving(false);
      }
    }
    await onContinue();
  };

  const primaryLabel = busy
    ? loading
      ? "Saving..."
      : "Validating..."
    : allSectionsApproved
      ? (labelWhenReady ?? "Save & continue")
      : "Validate, approve & continue";

  if (!showPrimary && !extraActions) return null;

  return (
    <div
      className={cn(
        "mt-6 flex w-full min-w-0 flex-col items-center justify-center gap-3 border-t border-white/[0.08] pt-5",
        className,
      )}
    >
      {showPrimary ? (
        <GuidedApproveAllStatusMessage
          allSectionsApproved={allSectionsApproved}
        />
      ) : null}
      <div className="flex w-full min-w-0 flex-row flex-wrap items-center justify-center gap-3">
        {showPrimary ? (
          <Button
            type="button"
            variant="event-primary"
            disabled={busy || continueDisabled}
            className={guidedOnboardingSaveNextButtonClass}
            onClick={() => void handlePrimaryClick()}
          >
            {primaryLabel}
          </Button>
        ) : null}
        {extraActions}
      </div>
    </div>
  );
}

type GuidedWholeStepSlice = {
  allSectionsApproved: boolean;
  handleApproveAllSections: () => Promise<boolean>;
};

/**
 * Steps 5–11 (single guided section): one primary button — validate & approve if needed, then save/continue/submit.
 */
export function GuidedWholeStepBottomActions({
  guided,
  onContinue,
  loading = false,
  labelWhenReady,
  alwaysShowReadyLabel = false,
  continueDisabled = false,
  continueTitle,
  extraActions,
  hintSlot,
  /** When set, replaces default approve/save hint row (e.g. payment step gateway warning). */
  statusSlot,
  className,
  primaryButtonClassName,
}: {
  guided: GuidedWholeStepSlice;
  onContinue: () => void | Promise<void>;
  loading?: boolean;
  labelWhenReady: string;
  alwaysShowReadyLabel?: boolean;
  continueDisabled?: boolean;
  continueTitle?: string;
  extraActions?: ReactNode;
  hintSlot?: ReactNode;
  statusSlot?: ReactNode;
  className?: string;
  primaryButtonClassName?: string;
}) {
  const [approving, setApproving] = useState(false);
  const busy = loading || approving;

  const primaryDisabled =
    busy || (guided.allSectionsApproved && continueDisabled);

  const handlePrimaryClick = async () => {
    if (primaryDisabled) return;
    const wasApproved = guided.allSectionsApproved;
    if (!wasApproved) {
      setApproving(true);
      try {
        const ok = await guided.handleApproveAllSections();
        if (!ok) return;
      } finally {
        setApproving(false);
      }
      await onContinue();
      return;
    }
    await onContinue();
  };

  const primaryLabel = busy
    ? approving
      ? "Validating..."
      : "Saving..."
    : alwaysShowReadyLabel || guided.allSectionsApproved
      ? labelWhenReady
      : "Validate, approve & continue";

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col items-center justify-center gap-3",
        className,
      )}
    >
      {hintSlot}
      {statusSlot !== undefined ? (
        statusSlot
      ) : (
        <GuidedApproveAllStatusMessage
          allSectionsApproved={guided.allSectionsApproved}
        />
      )}
      <div className="flex w-full min-w-0 flex-row flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="event-primary"
          disabled={primaryDisabled}
          title={continueTitle}
          className={cn(
            guidedOnboardingSaveNextButtonClass,
            primaryButtonClassName,
          )}
          onClick={() => void handlePrimaryClick()}
        >
          {primaryLabel}
        </Button>
        {extraActions}
      </div>
    </div>
  );
}
