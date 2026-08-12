"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Check, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreviewReviewChromeHeight } from "@/hooks/use-preview-review-chrome-height";

export type OnboardingPreviewTab = "main-landing" | "location" | "event";

type TabMeta = {
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
};

type OnboardingPreviewReviewChromeProps = {
  hasMultipleLocations: boolean;
  activeTab: OnboardingPreviewTab;
  availableTabs: OnboardingPreviewTab[];
  approved: Record<OnboardingPreviewTab, boolean>;
  tabMeta: Record<OnboardingPreviewTab, TabMeta>;
  locationLabel: string;
  eventLabel: string;
  onTabChange: (tab: OnboardingPreviewTab) => void;
  onEdit: () => void;
  onPrimaryAction: () => void;
};

/** Preview pages set theme vars that break default outline/ghost buttons. */
const chromeGhostBtn =
  "h-9 shrink-0 text-slate-700 hover:bg-slate-100 hover:text-slate-900";
const chromePrimaryBtn =
  "h-9 shrink-0 gap-1.5 bg-slate-900 px-4 text-white shadow-sm hover:bg-slate-800";

function getReviewSteps(hasMultipleLocations: boolean): OnboardingPreviewTab[] {
  return hasMultipleLocations
    ? ["main-landing", "location", "event"]
    : ["location", "event"];
}

function StepChip({
  label,
  done,
  active,
}: {
  label: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <li
      className={cn(
        "inline-flex max-w-[5.5rem] items-center gap-0.5 truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:max-w-[6.5rem] sm:text-[11px]",
        done && "bg-emerald-100 text-emerald-800",
        !done && active && "bg-slate-900 text-white",
        !done && !active && "bg-slate-100 text-slate-600",
      )}
      title={label}
    >
      {done ? <Check className="h-2.5 w-2.5 shrink-0" strokeWidth={3} /> : null}
      <span className="truncate">{label}</span>
    </li>
  );
}

export function OnboardingPreviewReviewChrome({
  hasMultipleLocations,
  activeTab,
  availableTabs,
  approved,
  tabMeta,
  locationLabel,
  eventLabel,
  onTabChange,
  onEdit,
  onPrimaryAction,
}: OnboardingPreviewReviewChromeProps) {
  const steps = getReviewSteps(hasMultipleLocations);
  const stepIndex = steps.indexOf(activeTab);
  const isLastStep = stepIndex >= 0 && stepIndex === steps.length - 1;
  const isCurrentApproved = approved[activeTab];
  const chromeRef = usePreviewReviewChromeHeight<HTMLDivElement>();
  const nextTab = !isLastStep ? steps[stepIndex + 1] : undefined;

  const stepTitle =
    activeTab === "main-landing"
      ? "Main Landing"
      : activeTab === "location"
        ? locationLabel
        : eventLabel;

  const nextStepTitle = nextTab
    ? nextTab === "location"
      ? locationLabel
      : nextTab === "event"
        ? eventLabel
        : tabMeta[nextTab].shortLabel
    : null;

  const primaryLabel = (() => {
    if (isLastStep) {
      return isCurrentApproved
        ? "Continue to Dashboard"
        : "Approve & continue to dashboard";
    }
    if (isCurrentApproved && nextStepTitle) {
      return `Next: ${nextStepTitle}`;
    }
    if (activeTab === "main-landing") {
      return "Looks good — continue";
    }
    if (activeTab === "location") {
      return `Approve ${locationLabel}`;
    }
    return `Approve ${eventLabel}`;
  })();

  return (
    <div
      ref={chromeRef}
      className="fixed inset-x-0 bottom-0 z-[80] isolate border-t border-slate-200 bg-white text-slate-900 shadow-[0_-2px_16px_rgba(15,23,42,0.1)]"
      role="region"
      aria-label="Onboarding preview review actions"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className="shrink-0 text-xs font-medium text-slate-600">
            <span className="text-slate-500">Review</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-semibold text-slate-900">
              {stepIndex + 1}/{steps.length} {stepTitle}
            </span>
          </p>

          <ol className="hidden min-w-0 flex-1 flex-wrap items-center justify-end gap-1 sm:flex">
            {steps.map((tab) => (
              <StepChip
                key={tab}
                label={tabMeta[tab].shortLabel}
                done={approved[tab]}
                active={activeTab === tab && !approved[tab]}
              />
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-0.5 rounded-[10px] bg-gray-100 p-0.5">
            {availableTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={cn(
                  "flex items-center gap-1.5 rounded-[7px] border-0 px-3 py-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:bg-black/[0.03] hover:text-gray-700 sm:px-3.5",
                  activeTab === tab &&
                    "bg-white font-semibold text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)]",
                )}
                onClick={() => onTabChange(tab)}
              >
                {tabMeta[tab].icon}
                <span className="hidden sm:inline">{tabMeta[tab].label}</span>
                <span className="sm:hidden">{tabMeta[tab].shortLabel}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className={chromeGhostBtn}
            >
              <PencilLine className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onPrimaryAction}
              className={chromePrimaryBtn}
            >
              <span className="hidden sm:inline">{primaryLabel}</span>
              <span className="sm:hidden">
                {isLastStep && isCurrentApproved ? "Continue" : "Approve"}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
