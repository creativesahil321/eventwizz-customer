"use client";

import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OnboardingSectionTitle } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export type GuidedUnlockSlice = {
  currentSectionIndex: number;
  approvedSections: Set<string>;
  sectionFlow: readonly { id: string }[];
  allSectionsApproved: boolean;
  handleUnlockSection: (index: number) => void;
};

type Props = {
  sectionIndex: number;
  sectionId: string;
  guided: GuidedUnlockSlice;
  title: ReactNode;
  className?: string;
};

function shouldShowSectionEdit(
  guided: GuidedUnlockSlice,
  sectionIndex: number,
  sectionId: string,
) {
  const isApproved = guided.approvedSections.has(sectionId);
  const isActive = guided.currentSectionIndex === sectionIndex;
  return (
    isApproved &&
    (!isActive || guided.allSectionsApproved)
  );
}

/** Icon + label control only (e.g. align with an existing title row). */
export function GuidedSectionUnlockButton({
  sectionIndex,
  sectionId,
  guided,
  className,
}: Omit<Props, "title">) {
  const showEdit = shouldShowSectionEdit(guided, sectionIndex, sectionId);
  if (!showEdit) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 shrink-0 gap-1.5 rounded-lg px-2.5 text-slate-300 hover:bg-white/[0.08] hover:text-white",
              className,
            )}
            onClick={() => guided.handleUnlockSection(sectionIndex)}
            aria-label="Edit this section"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            <span className="text-xs font-medium">Edit</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          className="max-w-xs border border-white/10 bg-slate-900 text-slate-100"
        >
          Edit this block. You’ll need to approve it again before you can
          continue.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Section heading with optional Edit: unlocks a completed section so the user can change answers
 * and re-approve (replaces the old top “chip” row for the same behavior).
 */
export function GuidedSectionTitleBar({
  sectionIndex,
  sectionId,
  guided,
  title,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "mb-4 flex min-w-0 items-center justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <OnboardingSectionTitle className="min-w-0">{title}</OnboardingSectionTitle>
      </div>
      <GuidedSectionUnlockButton
        sectionIndex={sectionIndex}
        sectionId={sectionId}
        guided={guided}
      />
    </div>
  );
}
