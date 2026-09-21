"use client";

import { CircleAlert } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  message: string;
  className?: string;
};

/** Warning icon on a date accordion; full validation copy on hover. */
export function DateRowErrorCue({ message, className }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn("inline-flex shrink-0 text-destructive", className)}
          aria-label={message}
        >
          <CircleAlert className="h-4 w-4" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="max-w-xs border border-red-400/30 bg-slate-950 text-red-100"
      >
        {message}
      </TooltipContent>
    </Tooltip>
  );
}
