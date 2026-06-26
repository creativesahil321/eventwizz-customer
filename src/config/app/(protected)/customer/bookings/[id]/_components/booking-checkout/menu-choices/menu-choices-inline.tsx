"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useQueries } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { bookingsKeys, useSaveMenuChoice } from "@/services/customer/bookings/query";
import { bookingsService } from "@/services/customer/bookings/bookings.service";
import type { PersistedMenuChoice, MenuCategory } from "@/services/customer/bookings/type";
import TableTabBar, { type TableTab } from "./table-tab-bar";
import StatusBar from "./status-bar";
import AttendeeForm, { type AttendeeFormData } from "./attendee-form";
import AttendeesSidebar from "./attendee-sidebar";

interface MenuChoicesInlineProps {
  bookingId: number;
  dateKey: string;
  roomId?: number;
  tableAllocations: Array<{
    id: number;
    label: string;
    people: number;
    capacity: number;
  }>;
}

function mapMenuSelectionsToChoicesArray(
  menuSelections: Record<string, string>,
  menuCategories: MenuCategory[],
): Array<{ event_menu_id: number; menu_item_id: number }> {
  const choices: Array<{ event_menu_id: number; menu_item_id: number }> = [];
  Object.entries(menuSelections).forEach(([categoryTitle, itemId]) => {
    const category = menuCategories.find((cat) => cat.title === categoryTitle);
    if (category?.id && itemId) {
      const menuItemId = parseInt(itemId);
      if (!isNaN(menuItemId) && menuItemId > 0) {
        choices.push({ event_menu_id: category.id, menu_item_id: menuItemId });
      }
    }
  });
  return choices;
}

function generateUniqueDuplicateName(
  baseName: string,
  existing: PersistedMenuChoice[],
): string {
  const baseClean = baseName.replace(/\s*\(Copy(?:\s+\d+)?\)\s*$/, "").trim();
  const escaped = baseClean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}\\s*\\(Copy(?:\\s+(\\d+))?\\)$`);

  const nums: number[] = [];
  for (const a of existing) {
    const match = pattern.exec(a.full_name);
    if (match) nums.push(match[1] ? parseInt(match[1]) : 1);
  }
  nums.sort((a, b) => b - a);
  const next = nums.length > 0 ? nums[0] + 1 : 1;
  return next === 1 ? `${baseClean} (Copy)` : `${baseClean} (Copy ${next})`;
}

export default function MenuChoicesInline({
  bookingId,
  dateKey,
  roomId,
  tableAllocations,
}: MenuChoicesInlineProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTableId, setActiveTableId] = useState(tableAllocations[0]?.id ?? 0);
  const [editingAttendee, setEditingAttendee] = useState<PersistedMenuChoice | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const isDuplicatingRef = useRef(false);
  const [pendingSaveCount, setPendingSaveCount] = useState(0);

  const resolvedRoomId =
    roomId != null && roomId > 0 ? roomId : undefined;

  const tableMenuQueries = useQueries({
    queries: tableAllocations.map((alloc) => ({
      queryKey: bookingsKeys.menuItem(
        bookingId,
        dateKey,
        alloc.id,
        resolvedRoomId,
      ),
      queryFn: () =>
        bookingsService.getMenuItems(
          bookingId,
          dateKey,
          alloc.id,
          resolvedRoomId,
        ),
      enabled: !!bookingId && !!dateKey && !!alloc.id,
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    })),
  });

  const activeTableIndex = Math.max(
    0,
    tableAllocations.findIndex((t) => t.id === activeTableId),
  );
  const activeQuery = tableMenuQueries[activeTableIndex];
  const isLoading = activeQuery?.isLoading ?? false;
  const menuItemsData = activeQuery?.data;

  const saveMenuChoice = useSaveMenuChoice();

  const menuCategories: MenuCategory[] = menuItemsData?.data?.event_menu || [];

  const allChoices = useMemo(() => {
    const byId = new Map<number, PersistedMenuChoice>();
    for (const query of tableMenuQueries) {
      for (const choice of query.data?.data?.menu_choices ?? []) {
        byId.set(choice.id, choice);
      }
    }
    return Array.from(byId.values());
  }, [tableMenuQueries]);

  const currentAttendees = useMemo(
    () => allChoices.filter((c) => c.table_id === activeTableId),
    [allChoices, activeTableId],
  );

  const activeTab = tableAllocations.find((t) => t.id === activeTableId);
  const totalSeats = activeTab?.people ?? 0;

  const displaySeatNumber = useMemo(() => {
    if (editingAttendee) {
      const index = currentAttendees.findIndex((a) => a.id === editingAttendee.id);
      if (index >= 0) return index + 1;
    }
    return Math.min(currentAttendees.length + 1, Math.max(totalSeats, 1));
  }, [editingAttendee, currentAttendees, totalSeats]);

  const isTableFull = currentAttendees.length + pendingSaveCount >= totalSeats;

  const completedCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const choice of allChoices) {
      counts[choice.table_id] = (counts[choice.table_id] ?? 0) + 1;
    }
    return counts;
  }, [allChoices]);

  const totalCompleted = Object.values(completedCounts).reduce((s, c) => s + c, 0);
  const totalCapacity = tableAllocations.reduce((s, t) => s + t.people, 0);
  const isFullyComplete =
    totalCapacity > 0 && totalCompleted >= totalCapacity;
  const hasProgress = totalCompleted > 0;

  const toggleStyle = isFullyComplete
    ? { background: "#ecfdf5", borderColor: "#bbf7d0", color: "#15803d" }
    : hasProgress
      ? { background: "#fff7ed", borderColor: "#fed7aa", color: "#c2410c" }
      : {
          background: "#f8fafc",
          borderColor: "#e2e8f0",
          color: "#0f172a",
        };

  const toggleLabel = expanded
    ? "Hide menu choices"
    : isFullyComplete
      ? "Menu choices complete"
      : "Add menu choices";

  const tabs: TableTab[] = tableAllocations.map((a) => ({
    id: a.id,
    label: a.label,
    people: a.people,
    capacity: a.capacity,
  }));

  const handleSave = useCallback(
    async (data: AttendeeFormData) => {
      const choices = mapMenuSelectionsToChoicesArray(data.menuSelections, menuCategories);
      if (choices.length === 0) {
        toast.error("Please select at least one menu item");
        return;
      }

      const payload = {
        booking_id: bookingId,
        table_id: activeTableId,
        ...(roomId != null && roomId > 0 && { room_id: roomId }),
        no_of_attendees: totalSeats,
        title: data.title,
        name: data.fullName,
        ...(editingAttendee?.id && { menu_choice_id: editingAttendee.id }),
        choices,
        allergens: data.allergens,
        dietary_requirements: data.dietaryRequirements,
        additional_notes: data.additionalNotes,
      };

      setPendingSaveCount((count) => count + 1);
      try {
        await saveMenuChoice.mutateAsync(payload);
        setEditingAttendee(null);
      } catch (err) {
        console.error("Save menu choice failed:", err);
      } finally {
        setPendingSaveCount((count) => Math.max(0, count - 1));
      }
    },
    [bookingId, activeTableId, roomId, totalSeats, editingAttendee, menuCategories, saveMenuChoice],
  );

  const handleDuplicate = useCallback(
    async (attendee: PersistedMenuChoice) => {
      if (isDuplicatingRef.current) return;
      if (currentAttendees.length + pendingSaveCount >= totalSeats) {
        toast.error("Table is full", {
          description: "Cannot duplicate. Edit an existing attendee instead.",
        });
        return;
      }

      isDuplicatingRef.current = true;
      setDuplicatingId(attendee.id);

      try {
        const dupName = generateUniqueDuplicateName(attendee.full_name, currentAttendees);
        await handleSave({
          title: attendee.title,
          fullName: dupName,
          menuSelections: attendee.menu_selections || {},
          allergens: attendee.allergens || [],
          dietaryRequirements: attendee.dietary_requirements || [],
          additionalNotes: attendee.additional_notes || "",
        });
      } finally {
        isDuplicatingRef.current = false;
        setDuplicatingId(null);
      }
    },
    [currentAttendees, totalSeats, pendingSaveCount, handleSave],
  );

  return (
    <div className="mt-3">
      <button
        type="button"
        className={
          expanded
            ? "flex w-full items-center justify-between rounded-t-lg border border-b-0 px-4 py-3 text-sm font-bold transition-opacity hover:opacity-90"
            : "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm font-bold transition-opacity hover:opacity-90"
        }
        style={toggleStyle}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex items-center gap-2">
          <UtensilsCrossed
            className="h-4 w-4 shrink-0"
            style={{ color: toggleStyle.color }}
          />
          {toggleLabel}
          {!expanded && totalCapacity > 0 && (
            <span
              className="text-[11px] font-semibold opacity-80"
              style={{ color: toggleStyle.color }}
            >
              · {totalCompleted}/{totalCapacity}
            </span>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0" style={{ color: toggleStyle.color }} />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" style={{ color: toggleStyle.color }} />
        )}
      </button>

      {expanded && (
        <div
          className="rounded-b-lg border border-t-0 border-gray-200 bg-white px-3 py-4 sm:px-5 sm:py-5"
        >
          {/* Toolbar: status + tabs */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
            <StatusBar completed={totalCompleted} total={totalCapacity} />
            <TableTabBar
              tabs={tabs}
              activeTabId={activeTableId}
              onTabChange={(id) => {
                setActiveTableId(id);
                setEditingAttendee(null);
              }}
              completedCounts={completedCounts}
            />
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading menu items...
            </div>
          ) : (
            <div className="min-w-0 rounded-xl border border-gray-200 bg-white md:rounded-none md:border-0 md:bg-transparent">
              <div className="grid min-w-0 grid-cols-1 gap-0 md:grid-cols-[1fr_280px] md:gap-5 lg:grid-cols-[1fr_320px]">
                <AttendeeForm
                  menuCategories={menuCategories}
                  tableLabel={activeTab?.label || "Table"}
                  seatNumber={displaySeatNumber}
                  totalSeats={totalSeats}
                  editingAttendee={editingAttendee}
                  isTableFull={isTableFull}
                  isSaving={saveMenuChoice.isPending}
                  onSave={handleSave}
                  onCancelEdit={() => setEditingAttendee(null)}
                  embedded
                />
                <AttendeesSidebar
                  attendees={currentAttendees}
                  totalSeats={totalSeats}
                  menuCategories={menuCategories}
                  onEdit={setEditingAttendee}
                  onDuplicate={handleDuplicate}
                  duplicatingId={duplicatingId}
                  isTableFull={isTableFull}
                  isSaving={saveMenuChoice.isPending}
                  embedded
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
