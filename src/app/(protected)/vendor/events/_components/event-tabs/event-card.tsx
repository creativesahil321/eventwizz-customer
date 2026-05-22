"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, CalendarDays, Dot, Eye } from "lucide-react";
import type { EventItem } from "@/services/vendor/events/type";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { addCacheBusting } from "@/lib/image-utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type EventCardProps = {
  event: EventItem;
  selected?: boolean;
  onSelect?: () => void;
  selectionMode?: boolean;
};

const statusClassMap: Record<string, string> = {
  active: "rounded-full bg-green-500",
  past: "rounded-full bg-blue-500",
  draft: "rounded-full bg-gray-400",
  cancelled: "rounded-full bg-red-500",
};

export const statusClass = (status: string) =>
  statusClassMap[status?.toLowerCase()] || "stroke-muted-foreground";

export default function EventCard({
  event,
  selected = false,
  onSelect,
  selectionMode = false,
}: EventCardProps) {
  const router = useRouter();

  const normalizeEventDates = (input: EventItem): string[] => {
    const rawDates =
      Array.isArray(input.event_dates) && input.event_dates.length > 0
        ? input.event_dates
        : input.event_date
          ? [input.event_date]
          : [];

    // De-dupe and keep a stable order.
    const seen = new Set<string>();
    return rawDates
      .map((d) => String(d).trim())
      .filter(Boolean)
      .filter((d) => {
        if (seen.has(d)) return false;
        seen.add(d);
        return true;
      });
  };

  const formatEventDateLabel = (raw: string): string => {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    return raw;
  };

  const eventDates = normalizeEventDates(event);
  const dateLabels = eventDates.map(formatEventDateLabel);
  const primaryDateLabel = dateLabels[0] ?? null;

  // Format the event name with first letter capitalized
  const formattedName = event.name
    ? event.name.charAt(0).toUpperCase() + event.name.slice(1)
    : "";

  // Format the status with first letter capitalized
  const formattedStatus = event.status
    ? event.status.charAt(0).toUpperCase() + event.status.slice(1)
    : "";

  const handleCardClick = (e: React.MouseEvent) => {
    // If in selection mode, always prevent navigation and toggle selection
    if (selectionMode && onSelect) {
      e.preventDefault();
      e.stopPropagation();
      onSelect();
    }
  };

  const handleOverviewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/vendor/events/${event?.id}/overview`);
  };

  return (
    <>
      <div
        className={`relative ${
          selected
            ? "ring-2 ring-[var(--color-primary)]"
            : selectionMode
              ? "ring-1 ring-gray-200"
              : ""
        } ${
          selectionMode
            ? "cursor-pointer transition-all hover:opacity-90 hover:shadow-md"
            : ""
        }`}
        onClick={
          selectionMode && onSelect
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect();
              }
            : undefined
        }
      >
        {selectionMode && (
          <>
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selected}
                onCheckedChange={() => onSelect && onSelect()}
                className="bg-white/70 hover:bg-white"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div
              className={`absolute inset-0 bg-primary/5 z-5 pointer-events-none ${
                selected ? "opacity-100" : "opacity-0"
              } transition-opacity`}
            ></div>
          </>
        )}

        <Link
          href={selectionMode ? "#" : `/vendor/events/${event?.id}`}
          className={`text-center block w-full ${
            selectionMode ? "pointer-events-none" : ""
          }`}
          onClick={handleCardClick}
        >
          <div className="p-2 sm:p-3 bg-background rounded-md shadow-2xl w-full">
            {event.image ? (
              <div className="relative w-full aspect-[4/3] overflow-hidden rounded-md rounded-bl-none rounded-br-none group">
                <img
                  src={addCacheBusting(
                    event.image,
                    event.updated_at?.toString() || null,
                  )}
                  alt={event.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Overview Button - Top Right (always visible, not hover-only) */}
                {!selectionMode && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleOverviewClick}
                    className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-white text-black shadow-lg backdrop-blur-sm h-8 px-3 text-xs font-medium"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    View Stats
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center w-full aspect-[4/3] bg-gray-300 rounded-sm dark:bg-gray-700">
                <Dot size={14} />
              </div>
            )}

            <h2 className="pt-2 text-sm sm:text-base font-medium line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] break-words">
              {formattedName}
            </h2>

            <div className="grid grid-cols-[1fr_auto] items-end gap-2 pt-2 sm:pt-3">
              {/* Left: Status (always aligned with date row) */}
              <div
                className={`font-medium flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0 ${
                  event?.status?.toLowerCase() === "active"
                    ? "text-event-green"
                    : event?.status?.toLowerCase() === "past"
                      ? "text-blue-500"
                      : event?.status?.toLowerCase() === "draft"
                        ? "text-gray-400"
                        : event?.status?.toLowerCase() === "cancelled"
                          ? "text-red-500"
                          : "text-foreground"
                }`}
              >
                <Dot
                  className={`w-3 h-3 flex-shrink-0 ${statusClass(event?.status)}`}
                />
                <span className="truncate">{formattedStatus}</span>
              </div>

              {/* Right: badge above date, fixed vertical rhythm for perfect alignment */}
              <div className="flex flex-col items-end justify-end min-w-0">
                {/* Reserve space so cards align even when there's no badge */}
                <div className="min-h-5 flex items-center justify-end">
                  {primaryDateLabel && dateLabels.length > 1 ? (
                    <TooltipProvider>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold w-fit cursor-pointer"
                            style={{
                              backgroundColor:
                                'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                              color: "var(--color-primary)",
                              borderColor:
                                'color-mix(in srgb, var(--color-primary) 30%, transparent)',
                            }}
                          >
                            <CalendarDays className="h-3 w-3" />
                            <span>{dateLabels.length} dates</span>
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-xs p-3 bg-popover border shadow-lg"
                        >
                          <div className="space-y-2">
                            <p className="font-semibold text-sm mb-2 text-black">
                              All Available Dates ({dateLabels.length}):
                            </p>
                            <div className="space-y-1.5">
                              {dateLabels.map((label, index) => (
                                <div
                                  key={`${event.id}-${eventDates[index] ?? index}`}
                                  className="flex items-center gap-2 text-xs text-muted-foreground"
                                >
                                  <span className="font-medium text-foreground text-black">
                                    {index + 1}.
                                  </span>
                                  <span className="text-black">{label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </div>

                {primaryDateLabel ? (
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-foreground transition-colors min-w-0 cursor-pointer">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate max-w-[11rem] sm:max-w-[12rem]">
                            {dateLabels.length === 1
                              ? primaryDateLabel
                              : `${primaryDateLabel} ...`}
                          </span>
                        </div>
                      </TooltipTrigger>
                      {dateLabels.length > 1 ? (
                        <TooltipContent
                          side="top"
                          className="max-w-xs p-3 bg-popover border shadow-lg"
                        >
                          <div className="space-y-2">
                            <p className="font-semibold text-sm mb-2 text-black">
                              All Available Dates ({dateLabels.length}):
                            </p>
                            <div className="space-y-1.5">
                              {dateLabels.map((label, index) => (
                                <div
                                  key={`${event.id}-${eventDates[index] ?? index}`}
                                  className="flex items-center gap-2 text-xs text-muted-foreground"
                                >
                                  <span className="font-medium text-foreground text-black">
                                    {index + 1}.
                                  </span>
                                  <span className="text-black">{label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TooltipContent>
                      ) : null}
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
              </div>
            </div>
          </div>
        </Link>
      </div>
    </>
  );
}
