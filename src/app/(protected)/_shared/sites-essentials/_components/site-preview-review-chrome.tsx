"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Check,
  Loader2,
  PencilLine,
  Save,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SitePreviewReviewStep } from "@/store/site-preview.store";
import type { PreviewLocationItem } from "../_lib/preview-locations";

/** Always-visible chrome buttons (preview page sets theme vars that break outline/ghost). */
const chromeOutlineBtn =
  "h-9 shrink-0 border border-slate-300 bg-white text-slate-900 shadow-sm hover:bg-slate-100 hover:text-slate-900";
const chromeGhostBtn =
  "h-9 shrink-0 text-slate-700 hover:bg-slate-100 hover:text-slate-900";
const chromePrimaryBtn =
  "h-9 shrink-0 bg-slate-900 text-white shadow-sm hover:bg-slate-800";

type SitePreviewReviewChromeProps = {
  hasMultipleLocations: boolean;
  reviewStep: SitePreviewReviewStep;
  mainPageApproved: boolean;
  previewLocations: PreviewLocationItem[];
  currentLocationIndex: number;
  approvedLocationSlugs: string[];
  isSaving: boolean;
  isLoadingLocation?: boolean;
  /**
   * View-only preview (no unsaved editor changes) — browse pages and close;
   * do not show Approve & save.
   */
  viewOnly?: boolean;
  onEdit: () => void;
  onApproveMain: () => void;
  onApproveCurrentLocation: () => void;
  onContinueFromMain: () => void;
  onNextLocation: () => void;
  onPreviousLocation?: () => void;
  onBackToMain?: () => void;
  /** Jump to Main home or a specific location in the review flow. */
  onGoToStep?: (step: "main" | { locationIndex: number }) => void;
  onSave: (options?: { approveSlug?: string }) => void;
  /** Close preview without saving (view-only). */
  onClosePreview?: () => void;
};

export function SitePreviewReviewChrome({
  hasMultipleLocations,
  reviewStep,
  mainPageApproved,
  previewLocations,
  currentLocationIndex,
  approvedLocationSlugs,
  isSaving,
  isLoadingLocation = false,
  viewOnly = false,
  onEdit,
  onApproveMain,
  onApproveCurrentLocation,
  onContinueFromMain,
  onNextLocation,
  onGoToStep,
  onSave,
  onClosePreview,
}: SitePreviewReviewChromeProps) {
  const currentLocation = previewLocations[currentLocationIndex];
  const currentSlug = currentLocation?.slug ?? "";
  const currentApproved = currentSlug
    ? approvedLocationSlugs.includes(currentSlug)
    : false;
  const isLastLocation =
    currentLocationIndex >= previewLocations.length - 1;
  const totalSteps = hasMultipleLocations
    ? 1 + previewLocations.length
    : Math.max(1, previewLocations.length);
  const stepNumber = hasMultipleLocations
    ? reviewStep === "main"
      ? 1
      : 2 + currentLocationIndex
    : 1;

  const stepTitle =
    reviewStep === "main"
      ? "Main home"
      : (currentLocation?.city ?? "Location");

  const handleMainPrimary = () => {
    if (viewOnly) {
      onContinueFromMain();
      return;
    }
    if (!mainPageApproved) onApproveMain();
    onContinueFromMain();
  };

  const handleLocationPrimary = () => {
    if (viewOnly) {
      if (!isLastLocation) onNextLocation();
      else onClosePreview?.();
      return;
    }
    if (!currentApproved) onApproveCurrentLocation();
    if (!isLastLocation) onNextLocation();
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[120] isolate border-t border-slate-200 bg-white text-slate-900 shadow-[0_-2px_16px_rgba(15,23,42,0.1)] pointer-events-auto"
      role="region"
      aria-label="Preview review actions"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2.5 px-3 py-2.5 sm:px-4 sm:py-3">
        {/* Row 1: step label + page badges (primary navigation) */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <p className="shrink-0 text-xs font-medium text-slate-600 sm:text-sm">
            <span className="text-slate-500">Preview</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-semibold text-slate-900">
              {stepNumber}/{totalSteps} {stepTitle}
            </span>
          </p>

          {hasMultipleLocations && previewLocations.length > 0 ? (
            <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <StepChip
                label="Home"
                done={!viewOnly && mainPageApproved}
                active={reviewStep === "main"}
                onClick={
                  onGoToStep ? () => onGoToStep("main") : undefined
                }
              />
              {previewLocations.map((loc, idx) => (
                <StepChip
                  key={loc.slug}
                  label={loc.city}
                  done={
                    !viewOnly && approvedLocationSlugs.includes(loc.slug)
                  }
                  active={
                    reviewStep === "location" && idx === currentLocationIndex
                  }
                  onClick={
                    onGoToStep
                      ? () => onGoToStep({ locationIndex: idx })
                      : undefined
                  }
                />
              ))}
            </ol>
          ) : null}
        </div>

        {/* Row 2: Edit + primary CTA */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className={chromeGhostBtn}
          >
            <PencilLine className="h-3.5 w-3.5" />
            Edit
          </Button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {reviewStep === "main" && hasMultipleLocations && (
              <Button
                type="button"
                size="sm"
                onClick={handleMainPrimary}
                disabled={!previewLocations.length}
                className={cn(chromePrimaryBtn, "gap-1.5 px-4")}
              >
                {viewOnly || mainPageApproved ? (
                  <>
                    {previewLocations[0]?.city ?? "Locations"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Looks good — continue
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}

            {reviewStep === "location" && !isLastLocation && (
              <Button
                type="button"
                size="sm"
                onClick={handleLocationPrimary}
                disabled={isLoadingLocation || (!viewOnly && !currentSlug)}
                className={cn(chromePrimaryBtn, "gap-1.5 px-4")}
              >
                {isLoadingLocation ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading…
                  </>
                ) : viewOnly || currentApproved ? (
                  <>
                    Next: {previewLocations[currentLocationIndex + 1]?.city}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Approve {currentLocation?.city}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}

            {reviewStep === "location" && isLastLocation && viewOnly && (
              <Button
                type="button"
                size="sm"
                onClick={() => onClosePreview?.()}
                className={cn(chromePrimaryBtn, "gap-1.5 px-4")}
              >
                <X className="h-3.5 w-3.5" />
                Close preview
              </Button>
            )}

            {reviewStep === "location" && isLastLocation && !viewOnly && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onSave({
                    approveSlug: currentApproved ? undefined : currentSlug,
                  });
                }}
                disabled={isSaving || (!currentSlug && !currentApproved)}
                className={cn(
                  chromePrimaryBtn,
                  "gap-1.5 px-4 pointer-events-auto relative z-[1]",
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : currentApproved ? (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Save changes
                  </>
                ) : (
                  <>
                    Approve & save
                    <Check className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}

            {/* View-only on Main (multi): allow leaving without walking every location */}
            {viewOnly &&
              reviewStep === "main" &&
              hasMultipleLocations && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onClosePreview?.()}
                  className={cn(chromeOutlineBtn, "gap-1.5 px-4")}
                >
                  <X className="h-3.5 w-3.5" />
                  Close preview
                </Button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepChip({
  label,
  done,
  active,
  onClick,
}: {
  label: string;
  done: boolean;
  active: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    "inline-flex max-w-[9rem] items-center gap-1.5 truncate rounded-lg px-3 py-1.5 text-sm font-semibold sm:max-w-[11rem] sm:px-3.5 sm:py-2 sm:text-[15px]",
    done && "bg-emerald-100 text-emerald-800",
    !done && active && "bg-slate-900 text-white shadow-sm",
    !done && !active && "bg-slate-100 text-slate-700",
    onClick &&
      "cursor-pointer transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
    onClick && active && "hover:bg-slate-800 hover:text-white",
  );

  if (onClick) {
    return (
      <li>
        <button
          type="button"
          className={className}
          title={`Go to ${label}`}
          onClick={onClick}
        >
          {done ? (
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />
          ) : null}
          <span className="truncate">{label}</span>
        </button>
      </li>
    );
  }

  return (
    <li className={className} title={label}>
      {done ? <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} /> : null}
      <span className="truncate">{label}</span>
    </li>
  );
}
