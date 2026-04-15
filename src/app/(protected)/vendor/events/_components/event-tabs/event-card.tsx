"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dot, Eye } from "lucide-react";
import { Event } from "../../_lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { addCacheBusting } from "@/lib/image-utils";

type EventCardProps = {
  event: Event;
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

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 sm:pt-3">
              {/* Status */}
              <p
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
                  className={`w-3 h-3 flex-shrink-0 ${statusClass(
                    event?.status,
                  )}`}
                />
                <span className="truncate">{formattedStatus}</span>
              </p>

              {/* Right side: badge + date */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap sm:justify-end min-w-0">
                {event.event_date && (
                  <p className="text-xs sm:text-sm text-gray-600 whitespace-nowrap hidden sm:block flex-shrink-0">
                    {new Date(event.event_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Link>
      </div>
    </>
  );
}
