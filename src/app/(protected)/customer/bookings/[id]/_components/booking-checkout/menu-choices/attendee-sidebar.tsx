"use client";

import { Copy, Edit2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MenuCategory, PersistedMenuChoice } from "@/services/customer/bookings/type";

interface AttendeesSidebarProps {
  attendees: PersistedMenuChoice[];
  totalSeats: number;
  menuCategories: MenuCategory[];
  onEdit: (attendee: PersistedMenuChoice) => void;
  onDuplicate: (attendee: PersistedMenuChoice) => void;
  duplicatingId: number | null;
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
}: AttendeesSidebarProps) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
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
      ) : (
        <div className="flex-1 overflow-y-auto max-h-96">
          {attendees.map((attendee, idx) => (
            <div
              key={attendee.id}
              className="flex items-center gap-2.5 border-b border-gray-50 px-4 py-3 last:border-b-0 hover:bg-gray-50/50 transition-colors"
            >
              <span className="min-w-5 text-xs font-semibold text-gray-400">
                {idx + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 truncate">
                  {attendee.title ? `${attendee.title} ` : ""}
                  {attendee.full_name}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500 truncate">
                  {getMenuSummary(attendee.menu_selections || {}, menuCategories)}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEdit(attendee)}
                  title="Edit"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDuplicate(attendee)}
                  disabled={duplicatingId === attendee.id}
                  title="Duplicate"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-3 text-center text-[11px] text-gray-400">
        Optional: You can finalise these later from your booking page
      </div>
    </div>
  );
}
