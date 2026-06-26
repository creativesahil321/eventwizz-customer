"use client";

import { Copy, Edit2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { MenuCategory, PersistedMenuChoice } from "@/services/customer/bookings/type";

interface AttendeesSidebarProps {
  attendees: PersistedMenuChoice[];
  totalSeats: number;
  menuCategories: MenuCategory[];
  onEdit: (attendee: PersistedMenuChoice) => void;
  onDuplicate: (attendee: PersistedMenuChoice) => void;
  duplicatingId: number | null;
  /** No spare seats — disable duplicate to avoid pointless API calls. */
  isTableFull?: boolean;
  isSaving?: boolean;
  /** Flat layout inside a shared mobile card — no outer border. */
  embedded?: boolean;
}

function getMenuSummary(
  selections: Record<string, string>,
  categories: MenuCategory[],
): string {
  const parts: string[] = [];
  for (const cat of categories) {
    const itemId = selections[cat.title];
    if (itemId) {
      const item = cat.items.find((i) => i.id.toString() === itemId);
      if (item) parts.push(item.name);
    }
  }
  return parts.join(" · ") || "No selections";
}

export default function AttendeesSidebar({
  attendees,
  totalSeats,
  menuCategories,
  onEdit,
  onDuplicate,
  duplicatingId,
  isTableFull = false,
  isSaving = false,
  embedded = false,
}: AttendeesSidebarProps) {
  const useScroll = attendees.length > 3;
  const duplicateDisabled = isTableFull || isSaving;

  const attendeeRows = (
    <div className="divide-y divide-gray-100">
      {attendees.map((attendee, idx) => (
        <div
          key={attendee.id}
          className="px-3 py-3 transition-colors hover:bg-gray-50/50 sm:px-4"
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 min-w-5 text-xs font-semibold text-gray-400">
              {idx + 1}.
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-snug text-gray-900 break-words">
                {attendee.title ? `${attendee.title} ` : ""}
                {attendee.full_name}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-gray-500 break-words">
                {getMenuSummary(attendee.menu_selections || {}, menuCategories)}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 pl-7">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 min-w-0 flex-1 gap-1.5 border-gray-200 bg-white px-2 text-xs font-medium text-gray-700"
              onClick={() => onEdit(attendee)}
              title="Edit"
            >
              <Edit2 className="h-3.5 w-3.5 shrink-0" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 min-w-0 flex-1 gap-1.5 border-gray-200 bg-white px-2 text-xs font-medium text-gray-700"
              onClick={() => onDuplicate(attendee)}
              disabled={duplicateDisabled || duplicatingId === attendee.id}
              title={
                isTableFull
                  ? "Table is full — edit an existing attendee instead"
                  : isSaving
                    ? "Please wait while saving"
                    : "Duplicate attendee"
              }
            >
              <Copy className="h-3.5 w-3.5 shrink-0" />
              Copy
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col bg-white",
        embedded
          ? "rounded-none border-0 border-t border-gray-200 md:rounded-xl md:border md:border-gray-200"
          : "overflow-hidden rounded-xl border border-gray-200",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-4 py-3.5 text-sm font-semibold text-gray-900">
        <Users className="h-4 w-4" />
        Attendees {attendees.length}/{totalSeats}
      </div>

      {/* List or empty */}
      {attendees.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
          <p className="text-sm font-medium text-gray-500">No attendees added yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Fill in the form to add menu selections
          </p>
        </div>
      ) : useScroll ? (
        <ScrollArea
          type="always"
          className={cn(
            "max-h-64 sm:max-h-80 md:max-h-96",
            "[&_[data-slot=scroll-area-viewport]]:w-full",
            "[&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:!w-full",
            "[&_[data-slot=scroll-area-scrollbar]]:opacity-100",
            "[&_[data-slot=scroll-area-thumb]]:bg-gray-400",
          )}
        >
          {attendeeRows}
        </ScrollArea>
      ) : (
        attendeeRows
      )}

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-3 text-center text-[11px] text-gray-400">
        Optional: You can finalise these later from your booking page
      </div>
    </div>
  );
}
