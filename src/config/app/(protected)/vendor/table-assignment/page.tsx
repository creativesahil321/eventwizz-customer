"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Shell } from "@/components/shell";
import { PermissionRoute } from "@/components/permission";
import { LocationIndicator } from "@/components/location-indicator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEvents } from "@/app/(protected)/vendor/events/_lib/queries";
import type { EventsQueryParams } from "@/services/vendor/events/type";
import {
  tableAssignmentsService,
  useConfirmTableAssignments,
  useDeleteFinalAssignment,
  useTableAssignments,
  useUploadSeatingPlanImage,
} from "@/services/vendor/table-assignments";
import { Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import type { TableAssignmentRow } from "./_lib/types";
import {
  formatEventDateLabel,
  splitBookedAcrossTempSlots,
  firstCrossRowTableConflict,
  applyFinalTablesUpdate,
  resolveApiAssetUrl,
  patchRowAfterFinalRemoval,
  slotKeyForRemovedFinal,
  parseVendorTempTables,
  parseVendorFinalTables,
  tempTableKeyForRemovedFinal,
  finalTablePersonCountsFromRow,
} from "./_lib/utils";
import { AssignTablesWorkspace } from "./_components/assign-tables-workspace";
import { AssignmentStatCards } from "./_components/assignment-stat-cards";

const MAX_SEATING_PLAN_BYTES = 8 * 1024 * 1024;

export default function TableAssignmentPage() {
  const { data: session } = useSession();
  const vendorLocationId = session?.user?.vendor_location_id;

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedDateKey, setSelectedDateKey] = useState<string>("");
  const [q, setQ] = useState("");
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [assignmentRows, setAssignmentRows] = useState<TableAssignmentRow[]>(
    [],
  );

  const eventsQueryParams = useMemo(
    () =>
      ({
        page: 1,
        per_page: 100,
        status: "active",
        vendor_location_id:
          vendorLocationId == null || vendorLocationId === ""
            ? undefined
            : vendorLocationId,
      }) satisfies EventsQueryParams,
    [vendorLocationId],
  );

  const { data: eventsData, isLoading: eventsLoading } = useEvents(
    eventsQueryParams,
    undefined,
    { enabled: Boolean(vendorLocationId) },
  );

  const events = eventsData?.items ?? [];

  const selectedEvent = useMemo(
    () => events.find((e) => String(e.id) === selectedEventId),
    [events, selectedEventId],
  );

  const selectedEventDates = useMemo(() => {
    const raw =
      selectedEvent?.event_dates && selectedEvent.event_dates.length > 0
        ? selectedEvent.event_dates
        : selectedEvent?.event_date
          ? [selectedEvent.event_date]
          : [];

    const seen = new Set<string>();
    return raw
      .map((d) => String(d).trim())
      .filter(Boolean)
      .filter((d) => {
        if (seen.has(d)) return false;
        seen.add(d);
        return true;
      });
  }, [selectedEvent]);

  const dateOptionsForUi = useMemo(() => {
    if (!selectedEventId) return [];
    return selectedEventDates.map((raw) => ({
      key: raw,
      label: formatEventDateLabel(raw),
      raw,
    }));
  }, [selectedEventId, selectedEventDates]);

  useEffect(() => {
    setSelectedDateKey("");
  }, [selectedEventId]);

  const selectionComplete = useMemo(() => {
    if (!selectedEventId) return false;
    if (!selectedDateKey) return false;
    return true;
  }, [selectedDateKey, selectedEventId]);

  const selectedDateRaw =
    dateOptionsForUi.find((d) => d.key === selectedDateKey)?.raw ?? "";

  const selectedEventSlug = selectedEvent?.slug ?? "";

  const debouncedSearch = useDebounce(q.trim(), 500);

  const {
    data: assignmentsData,
    isLoading: assignmentsLoading,
    isFetching: assignmentsFetching,
    error: assignmentsError,
  } = useTableAssignments(
    selectionComplete && selectedEventSlug && selectedDateRaw
      ? {
          event: selectedEventSlug,
          date: selectedDateRaw,
          per_page: 100,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        }
      : undefined,
  );

  const { mutate: confirmTables, isPending: isConfirming } =
    useConfirmTableAssignments();

  const { mutate: deleteFinalAssignment, isPending: isDeletingFinal } =
    useDeleteFinalAssignment();

  const { mutate: uploadSeatingPlan, isPending: isUploadingSeatingPlan } =
    useUploadSeatingPlanImage();

  const seatingPlanRaw = assignmentsData?.summary?.seating_plan_image ?? null;

  const seatingPlanImageUrl = useMemo(
    () => resolveApiAssetUrl(seatingPlanRaw),
    [seatingPlanRaw],
  );

  /** POST targets one booking date; use a stable id from loaded rows. */
  const seatingPlanBookingDateId = useMemo(() => {
    const ids = assignmentRows
      .map((r) => r.bookingDateId)
      .filter((id): id is number => typeof id === "number");
    if (ids.length === 0) return null;
    return Math.min(...ids);
  }, [assignmentRows]);

  const handleSeatingPlanFile = useCallback(
    (file: File) => {
      if (file.size > MAX_SEATING_PLAN_BYTES) return;
      if (seatingPlanBookingDateId == null) return;
      uploadSeatingPlan({
        bookingDateId: seatingPlanBookingDateId,
        file,
      });
    },
    [seatingPlanBookingDateId, uploadSeatingPlan],
  );

  useEffect(() => {
    if (!selectionComplete) {
      setAssignmentRows([]);
      return;
    }
    const apiRows = assignmentsData?.data ?? [];
    const mappedBase: TableAssignmentRow[] = apiRows.map((r, idx) => {
      const statusRaw = String(r.status || "").toLowerCase();
      const isDone = statusRaw === "completed" || statusRaw === "assigned";

      const tempParsed = parseVendorTempTables(r.temp_tables);
      const finalParsed = parseVendorFinalTables(r.final_tables);
      const tempTables = tempParsed.tempTables;
      const finalTables = finalParsed.finalTables;
      const tempTablesBySlotKey = tempParsed.tempTablesBySlotKey;
      const finalTablesBySlotKey = finalParsed.finalTablesBySlotKey;

      const bookedNum = Number(r.booked ?? 0) || 0;
      const tempTableSeatCounts =
        tempTables.length > 0
          ? tempParsed.tempTableSeatCounts &&
              tempParsed.tempTableSeatCounts.length === tempTables.length
            ? tempParsed.tempTableSeatCounts
            : splitBookedAcrossTempSlots(bookedNum, tempTables.length)
          : undefined;

      const stableId =
        r.booking_date_id != null
          ? `bd:${r.booking_date_id}`
          : r.booking_id != null
            ? `b:${r.booking_id}:${selectedDateRaw}`
            : `row:${idx}:${r.guest ?? ""}:${tempTables.join(",")}:${Number(r.booked ?? 0) || 0}`;
      const rowCore: TableAssignmentRow = {
        id: stableId,
        bookingDateId:
          typeof r.booking_date_id === "number" ? r.booking_date_id : undefined,
        bookingId: typeof r.booking_id === "number" ? r.booking_id : undefined,
        name: r.guest ?? "",
        booked: bookedNum,
        tempTables,
        ...(tempTableSeatCounts ? { tempTableSeatCounts } : {}),
        finalTables,
        ...(tempTablesBySlotKey ? { tempTablesBySlotKey } : {}),
        ...(finalTablesBySlotKey ? { finalTablesBySlotKey } : {}),
        status: isDone ? "assigned" : "pending",
        isConfirmed: isDone,
      };
      const finalTableSeatCounts =
        finalTables.length > 0
          ? finalParsed.finalTableSeatCounts &&
              finalParsed.finalTableSeatCounts.length === finalTables.length
            ? finalParsed.finalTableSeatCounts
            : finalTablePersonCountsFromRow(rowCore)
          : undefined;

      return {
        ...rowCore,
        ...(finalTableSeatCounts?.length ? { finalTableSeatCounts } : {}),
      };
    });

    // Strict cross-row validation: mark any duplicate final tables as pending and surface a warning.
    const occurrences = new Map<string, number>();
    for (const r of mappedBase) {
      for (const t of r.finalTables) {
        const n = String(t).trim();
        if (!n) continue;
        occurrences.set(n, (occurrences.get(n) ?? 0) + 1);
      }
    }

    const mapped = mappedBase.map((r) => {
      const dupes = r.finalTables
        .map((t) => String(t).trim())
        .filter(Boolean)
        .filter((n) => (occurrences.get(n) ?? 0) > 1);
      if (dupes.length === 0) return r;
      return {
        ...r,
        status: "pending" as const,
        isConfirmed: false,
        pendingHint: `Conflict: ${[...new Set(dupes)].join(", ")}`,
      };
    });

    setAssignmentRows(mapped);
  }, [assignmentsData?.data, selectionComplete, selectedDateRaw]);

  const assignmentTotals = useMemo(() => {
    const s = assignmentsData?.summary;
    return {
      totalSeats: Number(s?.total_tables ?? 0) || 0,
      completeGuests: Number(s?.completed_tables ?? 0) || 0,
      awaitingGuests: Number(s?.awaiting_tables ?? 0) || 0,
    };
  }, [assignmentsData?.summary]);

  const handleFinalTablesChange = useCallback(
    (id: string, tables: string[]) => {
      setAssignmentRows((prev) => {
        const row = prev.find((r) => r.id === id);
        if (!row) return prev;

        const capped = [
          ...new Set(tables.map((t) => t.trim()).filter(Boolean)),
        ].slice(0, row.booked);

        const conflict = firstCrossRowTableConflict(prev, id, capped);
        if (conflict) return prev;

        return prev.map((r) =>
          r.id === id ? applyFinalTablesUpdate(r, capped) : r,
        );
      });
    },
    [],
  );

  const handleRemoveFinalTable = useCallback(
    (rowId: string, removedFinal: string) => {
      const row = assignmentRows.find((r) => r.id === rowId);
      if (!row) return;

      const slotKey =
        row.finalTablesBySlotKey &&
        Object.keys(row.finalTablesBySlotKey).length > 0
          ? slotKeyForRemovedFinal(row.finalTablesBySlotKey, removedFinal)
          : tempTableKeyForRemovedFinal(
              row.tempTables,
              row.finalTables,
              removedFinal,
            );

      const applyLocalRemoval = () => {
        setAssignmentRows((prev) =>
          prev.map((r) =>
            r.id === rowId ? patchRowAfterFinalRemoval(r, removedFinal) : r,
          ),
        );
      };

      if (row.bookingDateId == null) {
        applyLocalRemoval();
        return;
      }

      if (slotKey == null) {
        applyLocalRemoval();
        return;
      }

      deleteFinalAssignment(
        { bookingDateId: row.bookingDateId, tempTable: slotKey },
        {
          onSuccess: () => {
            applyLocalRemoval();
          },
        },
      );
    },
    [assignmentRows, deleteFinalAssignment],
  );

  const handleConfirmFinalTables = useCallback(
    (id: string) => {
      const row = assignmentRows.find((r) => r.id === id);
      if (!row) return;
      if (row.bookingDateId == null) return;
      if (row.finalTables.length !== row.booked) return;

      const conflict = firstCrossRowTableConflict(
        assignmentRows,
        row.id,
        row.finalTables,
      );
      if (conflict) return;

      confirmTables(
        row.finalTablesBySlotKey &&
          Object.keys(row.finalTablesBySlotKey).length > 0
          ? {
              bookingDateId: row.bookingDateId,
              finalTablesBySlotKey: row.finalTablesBySlotKey,
            }
          : {
              bookingDateId: row.bookingDateId,
              tempTables: row.tempTables,
              finalTables: row.finalTables,
            },
        {
          onSuccess: () => {
            setAssignmentRows((prev) =>
              prev.map((r) =>
                r.id === id
                  ? {
                      ...r,
                      isConfirmed: true,
                      status: "assigned",
                    }
                  : r,
              ),
            );
          },
        },
      );
    },
    [assignmentRows, confirmTables],
  );

  /** Rows come from the API; `search` is applied server-side (debounced). */
  const filteredRows = assignmentRows;

  const isFiltered = Boolean(debouncedSearch);
  const filteredCountHint = isFiltered ? filteredRows.length : null;

  const selectedEventName = selectedEvent?.name ?? "";

  const selectedDateLabel =
    dateOptionsForUi.find((d) => d.key === selectedDateKey)?.label ?? "";

  const selectTriggerClass =
    "h-10 w-full min-w-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/25";

  const canExport =
    selectionComplete && Boolean(selectedEventSlug && selectedDateRaw);

  const handleExportCsv = async () => {
    if (!selectionComplete || !selectedEventSlug || !selectedDateRaw) return;

    setIsExportingCsv(true);
    try {
      await tableAssignmentsService.exportCsv({
        event: selectedEventSlug,
        date: selectedDateRaw,
      });
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <PermissionRoute
      permissionKey="read-table-assignment"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page min-w-0 text-black">
        <Shell className="gap-2">
          {/* Single compact header: same pattern as Booking History (title block + filters on the right). */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-4 min-w-0 dark:bg-card">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4">
                <div className="flex flex-col gap-3 min-w-0">
                  <h1 className="text-2xl title-header font-bold text-black flex items-center gap-2">
                  Table Assignment
                  {assignmentsFetching && assignmentsData ? (
                    <Loader2
                      className="h-5 w-5 shrink-0 animate-spin text-primary"
                      aria-hidden
                    />
                  ) : null}
                </h1>
                  <LocationIndicator variant="card" />
                  <p className="text-muted-foreground">
                    Assign final table numbers—choose event, room, and date,
                    then edit the grid below.
                  </p>
                </div>

                {/* Booking-style filters: compact, no visible labels, flex-wrap on small screens */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center w-full sm:w-auto min-w-0">
                  <div className="flex flex-wrap gap-3 items-center w-full sm:min-w-0 sm:max-w-full min-w-0">
                    <div className="w-full min-w-0 sm:w-auto sm:min-w-[260px]">
                      <Label htmlFor="ta-event" className="sr-only">
                        Event
                      </Label>
                      <Select
                        value={selectedEventId || undefined}
                        onValueChange={setSelectedEventId}
                        disabled={!vendorLocationId || eventsLoading}
                      >
                        <SelectTrigger
                          id="ta-event"
                          className={selectTriggerClass}
                        >
                          <SelectValue
                            placeholder={
                              eventsLoading ? "Loading…" : "Select event"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {events.map((e) => (
                            <SelectItem key={e.id} value={String(e.id)}>
                              {e.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full min-w-0 sm:w-[200px] shrink-0 min-w-[160px]">
                      <Label htmlFor="ta-date" className="sr-only">
                        Date
                      </Label>
                      <Select
                        value={selectedDateKey || undefined}
                        onValueChange={setSelectedDateKey}
                        disabled={
                          !selectedEventId || dateOptionsForUi.length === 0
                        }
                      >
                        <SelectTrigger
                          id="ta-date"
                          className={selectTriggerClass}
                        >
                          <SelectValue
                            placeholder={
                              !selectedEventId
                                ? "Date"
                                : dateOptionsForUi.length === 0
                                  ? "No dates"
                                  : "Date"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {dateOptionsForUi.map((d) => (
                            <SelectItem key={d.key} value={d.key}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selectionComplete ? (
              <div className="pt-4 border-t border-[var(--color-border)] transition-opacity duration-200">
                <AssignmentStatCards
                  totals={assignmentTotals}
                  filteredCount={filteredCountHint}
                  totalGuestRows={assignmentRows.length}
                  showFilterHint={false}
                />
              </div>
            ) : null}
          </div>

          {!selectionComplete ? (
            <div className="mb-4 rounded-lg border border-dashed border-[var(--color-border)] bg-white px-4 py-10 text-center shadow-sm dark:bg-card">
              <p className="text-sm font-medium text-foreground">
                Select event and date above
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                The summary tiles and assignment table appear here next.
              </p>
            </div>
          ) : assignmentsLoading && !assignmentsData ? (
            <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-white px-4 py-10 text-center shadow-sm dark:bg-card">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading table assignments…
              </div>
            </div>
          ) : assignmentsError ? (
            <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-white px-4 py-10 text-center shadow-sm dark:bg-card">
              <p className="text-sm font-medium text-foreground">
                Couldn’t load table assignments
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                {assignmentsError instanceof Error
                  ? assignmentsError.message
                  : "Please try again."}
              </p>
            </div>
          ) : (
            <AssignTablesWorkspace
              selectedEventName={selectedEventName}
              selectedRoomLabel=""
              selectedDateLabel={selectedDateLabel}
              assignmentRows={assignmentRows}
              filteredRows={filteredRows}
              searchQuery={q}
              onSearchChange={setQ}
              onSearchReset={() => setQ("")}
              onFinalTablesChange={handleFinalTablesChange}
              onRemoveFinalTable={handleRemoveFinalTable}
              onConfirmFinalTables={handleConfirmFinalTables}
              isSaving={isConfirming}
              isRemovingFinal={isDeletingFinal}
              onExportCsv={handleExportCsv}
              exportDisabled={
                !canExport || assignmentsLoading || isExportingCsv
              }
              seatingPlanImageUrl={seatingPlanImageUrl}
              onSeatingPlanFileSelected={handleSeatingPlanFile}
              seatingPlanUploadDisabled={seatingPlanBookingDateId == null}
              isUploadingSeatingPlan={isUploadingSeatingPlan}
            />
          )}
        </Shell>
      </section>
    </PermissionRoute>
  );
}
