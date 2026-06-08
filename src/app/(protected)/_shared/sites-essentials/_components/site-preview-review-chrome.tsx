"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  PencilLine,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SitePreviewReviewStep } from "@/store/site-preview.store";
import type { PreviewLocationItem } from "../_lib/preview-locations";
import { allPreviewLocationsApproved } from "../_lib/preview-locations";

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
  onEdit: () => void;
  onApproveMain: () => void;
  onApproveCurrentLocation: () => void;
  onContinueFromMain: () => void;
  onNextLocation: () => void;
  onPreviousLocation: () => void;
  onBackToMain?: () => void;
  onSave: () => void;
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
  onEdit,
  onApproveMain,
  onApproveCurrentLocation,
  onContinueFromMain,
  onNextLocation,
  onPreviousLocation,
  onBackToMain,
  onSave,
}: SitePreviewReviewChromeProps) {
  const currentLocation = previewLocations[currentLocationIndex];
  const currentSlug = currentLocation?.slug ?? "";
  const currentApproved = currentSlug
    ? approvedLocationSlugs.includes(currentSlug)
    : false;
  const allLocationsDone = allPreviewLocationsApproved(
    previewLocations,
    approvedLocationSlugs,
  );
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

  const canSave = hasMultipleLocations
    ? mainPageApproved && allLocationsDone
    : allLocationsDone;

  const stepTitle =
    reviewStep === "main"
      ? "Main home"
      : (currentLocation?.city ?? "Location");

  const handleMainPrimary = () => {
    if (!mainPageApproved) onApproveMain();
    onContinueFromMain();
  };

  const handleLocationPrimary = () => {
    if (!currentApproved) onApproveCurrentLocation();
    if (!isLastLocation) onNextLocation();
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] isolate border-t border-slate-200 bg-white text-slate-900 shadow-[0_-2px_16px_rgba(15,23,42,0.1)]"
      role="region"
      aria-label="Preview review actions"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
        {/* Row 1: step label + progress chips */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className="shrink-0 text-xs font-medium text-slate-600">
            <span className="text-slate-500">Preview</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-semibold text-slate-900">
              {stepNumber}/{totalSteps} {stepTitle}
            </span>
          </p>

          {hasMultipleLocations && previewLocations.length > 0 ? (
            <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              <StepChip
                label="Home"
                done={mainPageApproved}
                active={reviewStep === "main"}
              />
              {previewLocations.map((loc, idx) => (
                <StepChip
                  key={loc.slug}
                  label={loc.city}
                  done={approvedLocationSlugs.includes(loc.slug)}
                  active={
                    reviewStep === "location" && idx === currentLocationIndex
                  }
                />
              ))}
            </ol>
          ) : null}
        </div>

        {/* Row 2: actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
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
            {reviewStep === "location" && currentLocationIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPreviousLocation}
                disabled={isLoadingLocation}
                className={chromeOutlineBtn}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            )}
            {hasMultipleLocations && reviewStep === "location" && onBackToMain && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBackToMain}
                disabled={isLoadingLocation}
                className={chromeOutlineBtn}
              >
                Home
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {reviewStep === "main" && hasMultipleLocations && (
              <Button
                type="button"
                size="sm"
                onClick={handleMainPrimary}
                disabled={!previewLocations.length}
                className={cn(chromePrimaryBtn, "gap-1.5 px-4")}
              >
                {mainPageApproved ? (
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
                disabled={isLoadingLocation || !currentSlug}
                className={cn(chromePrimaryBtn, "gap-1.5 px-4")}
              >
                {isLoadingLocation ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading…
                  </>
                ) : currentApproved ? (
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

            {reviewStep === "location" && isLastLocation && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (!currentApproved) onApproveCurrentLocation();
                  else onSave();
                }}
                disabled={
                  isLoadingLocation ||
                  isSaving ||
                  (!currentApproved && !currentSlug) ||
                  (currentApproved && !canSave)
                }
                className={cn(chromePrimaryBtn, "gap-1.5 px-4")}
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
