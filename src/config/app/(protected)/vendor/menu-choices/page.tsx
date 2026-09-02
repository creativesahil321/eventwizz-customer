"use client";

import { Shell } from "@/components/shell";
import React, { useState, useEffect } from "react";
import CustomerMenuDataTable from "./_components/customer-menu-data-table";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { Input } from "@/components/ui/input";
import { Download, RotateCcw, Search, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { useCustomerMenuChoicesList } from "./_lib/queries";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import { menuChoicesService } from "@/services/vendor/menu_choices";
import type { EventWithDates } from "@/services/vendor/menu_choices/type";
import { LocationScopedTitle } from "@/components/location-indicator";
import { PermissionRoute } from "@/components/permission";

/** Event option for filter dropdown (from events_with_dates) */
interface FilterEvent {
  id: string;
  name: string;
}

/** Date option for date dropdown */
interface FilterDate {
  value: string;
  label: string;
}

/** Format YYYY-MM-DD to readable label e.g. "Friday, January 30, 2026" */
function formatDateLabel(raw: string): string {
  const d = new Date(raw + "T12:00:00");
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getEventsFromApi(
  eventsWithDates: EventWithDates[] | undefined,
): FilterEvent[] {
  if (!eventsWithDates?.length) return [];
  return eventsWithDates.map((e) => ({
    id: String(e.event_id),
    name: e.event_name,
  }));
}

function getDatesForEvent(
  eventsWithDates: EventWithDates[] | undefined,
  selectedEventId: string,
): FilterDate[] {
  if (!eventsWithDates?.length || !selectedEventId) return [];
  const eventId = Number(selectedEventId);
  const event = eventsWithDates.find((e) => e.event_id === eventId);
  if (!event?.dates?.length) return [];
  return event.dates.map((raw) => ({
    value: raw,
    label: formatDateLabel(raw),
  }));
}

export default function Page() {
  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [per_page] = useQueryState("per_page", parseAsInteger.withDefault(30));
  const [eventNameInUrl, setEventNameInUrl] = useQueryState(
    "event_name",
    parseAsString.withDefault(""),
  );

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedEventDate, setSelectedEventDate] = useState<string>("");
  const [roomFilter, setRoomFilter] = useState("all");
  const [eventComboboxOpen, setEventComboboxOpen] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [dateCsvExporting, setDateCsvExporting] = useState(false);

  const debouncedEventName = useDebounce(eventSearchQuery.trim(), 400);

  useEffect(() => {
    setEventNameInUrl(debouncedEventName || "");
  }, [debouncedEventName, setEventNameInUrl]);

  useEffect(() => {
    if (eventNameInUrl?.trim() && !eventSearchQuery.trim())
      setEventSearchQuery(eventNameInUrl);
    // Sync URL → input only when URL has value and input is empty (load/back); omit eventSearchQuery to avoid overwriting while typing
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: do not sync when user is typing
  }, [eventNameInUrl]);

  const appliedEventId =
    selectedEventId && !Number.isNaN(Number(selectedEventId))
      ? Number(selectedEventId)
      : undefined;
  const appliedEventDate = selectedEventDate || undefined;
  const selectedRoomId = roomFilter === "all" ? undefined : roomFilter;

  const [, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  useEffect(() => {
    setPage(1);
  }, [appliedEventId, appliedEventDate, eventNameInUrl, roomFilter, setPage]);

  const menuSearch = {
    search: "",
    page: page ?? 1,
    per_page: per_page ?? 30,
    event_id: appliedEventId,
    event_date: appliedEventDate,
    event_name: eventNameInUrl?.trim() || undefined,
    room_id: selectedRoomId,
  };

  const {
    data: menuChoicesResponse,
    isLoading: menuChoicesLoading,
    isError: menuChoicesError,
  } = useCustomerMenuChoicesList(menuSearch);

  const filterMeta = menuChoicesResponse?.filter_meta;
  const availableRooms = React.useMemo(
    () => filterMeta?.available_rooms ?? [],
    [filterMeta?.available_rooms],
  );
  const showRoomFilter =
    !!appliedEventDate &&
    filterMeta?.has_room_bookings === true &&
    availableRooms.length > 0;

  const eventsWithDates = menuChoicesResponse?.events_with_dates ?? [];
  const events = getEventsFromApi(eventsWithDates);
  const eventDates = getDatesForEvent(eventsWithDates, selectedEventId);

  const isSearching =
    menuChoicesLoading || eventSearchQuery.trim() !== debouncedEventName;
  const eventsLoading = eventComboboxOpen && isSearching;
  const eventsError = menuChoicesError;

  useEffect(() => {
    if (!selectedEventId) {
      setSelectedEventDate("");
      setRoomFilter("all");
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (!appliedEventDate) {
      if (roomFilter !== "all") setRoomFilter("all");
      return;
    }

    if (roomFilter === "all") return;

    const isValidSelection = availableRooms.some(
      (room) => String(room.room_id) === roomFilter,
    );
    if (!isValidSelection) {
      setRoomFilter("all");
    }
  }, [appliedEventDate, availableRooms, roomFilter]);

  const selectedEventName =
    events.find((e) => e.id === selectedEventId)?.name ?? "";

  const handleEventComboboxOpenChange = (open: boolean) => {
    setEventComboboxOpen(open);
    if (!open && selectedEventId && !eventSearchQuery.trim())
      setEventSearchQuery(selectedEventName);
  };
  const handleSelectEvent = (ev: FilterEvent) => {
    setSelectedEventId(ev.id);
    setSelectedEventDate("");
    setRoomFilter("all");
    setEventSearchQuery(ev.name);
    setEventComboboxOpen(false);
  };

  const hasEventDateFilter =
    appliedEventId != null ||
    (appliedEventDate?.length ?? 0) > 0 ||
    roomFilter !== "all";

  const handleResetAllFilters = () => {
    setSelectedEventId("");
    setSelectedEventDate("");
    setRoomFilter("all");
    setEventSearchQuery("");
    setEventNameInUrl("");
    setPage(1);
  };

  const handleEventDateChange = (value: string) => {
    setSelectedEventDate(value);
    setRoomFilter("all");
  };

  const handleDownloadAllCsvForDate = async () => {
    if (!selectedEventId || !selectedEventDate) return;
    const eventId = Number(selectedEventId);
    if (Number.isNaN(eventId)) return;
    setDateCsvExporting(true);
    try {
      await menuChoicesService.exportByDateCsv(
        eventId,
        selectedEventDate,
        selectedRoomId,
      );
      toast.success("CSV downloaded successfully");
    } catch {
      toast.error("Failed to download CSV. Please try again.");
    } finally {
      setDateCsvExporting(false);
    }
  };

  return (
    <PermissionRoute
      permissionKey="read-menu-choice"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page text-black min-w-0">
        <Shell className="gap-2">
          <div className="flex flex-col gap-4 min-w-0">
            {/* Header Card */}
            <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-4 min-w-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4">
                {/* Title */}
                <div className="flex flex-col gap-3">
                  <h1 className="text-2xl title-header font-bold text-black">
                    <LocationScopedTitle title="Customer Menu Choices" />
                  </h1>
                  <p className="text-muted-foreground">
                    Guest menu choices for events at this venue.
                  </p>
                </div>

                {/* Filters: event search, date, reset, download CSV for date */}
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <Popover
                    open={eventComboboxOpen}
                    onOpenChange={handleEventComboboxOpenChange}
                  >
                    <PopoverTrigger asChild>
                      <div className="relative w-full sm:w-[280px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="Search or select event…"
                          value={eventSearchQuery}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEventSearchQuery(v);
                            if (!eventComboboxOpen) setEventComboboxOpen(true);
                            if (!v.trim() && selectedEventId)
                              setSelectedEventId("");
                          }}
                          onFocus={() => setEventComboboxOpen(true)}
                          className="pl-8 pr-8 w-full"
                          aria-label="Search or select event"
                          aria-busy={isSearching}
                        />
                        {isSearching ? (
                          <Loader2
                            className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground"
                            aria-hidden
                          />
                        ) : (
                          <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <Command
                        shouldFilter={false}
                        className="rounded-md border-0 shadow-none"
                      >
                        <CommandList className="max-h-[280px]">
                          {eventsLoading && (
                            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                              <Loader2
                                className="h-4 w-4 shrink-0 animate-spin"
                                aria-hidden
                              />
                              <span>Searching events…</span>
                            </div>
                          )}
                          {!eventsLoading && eventsError && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              Could not load events. Try again.
                            </div>
                          )}
                          {!eventsLoading &&
                            !eventsError &&
                            events.length === 0 &&
                            (!eventNameInUrl?.trim() ||
                              !menuChoicesLoading) && (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                {eventNameInUrl?.trim()
                                  ? "No event found for this search."
                                  : "No events to show."}
                              </div>
                            )}
                          {!eventsLoading &&
                            !eventsError &&
                            events.length > 0 &&
                            events.map((ev) => (
                              <CommandItem
                                key={ev.id}
                                value={ev.name}
                                onSelect={() => handleSelectEvent(ev)}
                                className="cursor-pointer"
                              >
                                {ev.name}
                              </CommandItem>
                            ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Select
                    value={selectedEventDate}
                    onValueChange={handleEventDateChange}
                    disabled={!selectedEventId}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue
                        placeholder={
                          !selectedEventId
                            ? "Select event first"
                            : "Select date"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {eventDates.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showRoomFilter && (
                    <Select
                      value={roomFilter}
                      onValueChange={setRoomFilter}
                      disabled={menuChoicesLoading}
                    >
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <div className="flex items-center gap-2 truncate">
                          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <SelectValue placeholder="All halls" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All halls</SelectItem>
                        {availableRooms.map((room) => (
                          <SelectItem
                            key={room.room_id}
                            value={String(room.room_id)}
                          >
                            {room.room_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {hasEventDateFilter && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetAllFilters}
                      className="gap-2 shrink-0"
                      aria-label="Reset filters"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset all
                    </Button>
                  )}
                  {selectedEventId && selectedEventDate && (
                    <Button
                      variant="event-primary"
                      size="sm"
                      onClick={handleDownloadAllCsvForDate}
                      disabled={dateCsvExporting}
                      className="flex items-center gap-2 shrink-0"
                      aria-label="Export CSV for selected date"
                    >
                      {dateCsvExporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Export CSV for selected date
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Data Table */}
            <Suspense
              fallback={
                <DataTableSkeleton
                  columnCount={8}
                  cellWidths={[
                    "4rem",
                    "12rem",
                    "12rem",
                    "12rem",
                    "16rem",
                    "12rem",
                    "10rem",
                    "6rem",
                  ]}
                  shrinkZero
                />
              }
            >
              <CustomerMenuDataTable search={menuSearch} />
            </Suspense>
          </div>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
