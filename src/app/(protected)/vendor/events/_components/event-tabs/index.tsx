"use client";

import {
  parseAsString,
  parseAsInteger,
  SearchParams,
  useQueryState,
} from "nuqs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import EventCard from "./event-card";
import EventsTabSkeleton from "./events-skeleton";
import EventListFilters from "./event-list-filters";
import {
  useEvents,
  useBulkDeleteEvents,
} from "../../_lib/queries";
import EventPagination from "./event-pagination";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { EventItem, EventsQueryParams } from "@/services/vendor/events/type";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LocationScopedTitle } from "@/components/location-indicator";
import { PermissionGuard } from "@/components/permission/PermissionGuard";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const tabs = ["active", "old", "draft", "cancelled"] as const;
const tabLabels: Record<(typeof tabs)[number], string> = {
  active: "Active",
  old: "Past",
  draft: "Draft",
  cancelled: "Cancelled",
};

type EventsProps = {
  search: SearchParams;
};

function normalizeStatus(
  raw: string | null | undefined,
): (typeof tabs)[number] {
  if (raw && tabs.includes(raw as (typeof tabs)[number])) {
    return raw as (typeof tabs)[number];
  }
  return "active";
}

function parseDateRangeFromUrl(
  from?: string | null,
  to?: string | null,
): DateRange | undefined {
  if (!from) return undefined;
  const fromDate = parseISO(from);
  if (Number.isNaN(fromDate.getTime())) return undefined;
  const toDate = to ? parseISO(to) : fromDate;
  if (Number.isNaN(toDate.getTime())) return { from: fromDate, to: fromDate };
  return { from: fromDate, to: toDate };
}

export default function EventTabs({ search }: EventsProps) {
  const session = useSession();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<number[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const [status, setStatus] = useQueryState(
    "status",
    parseAsString.withDefault(
      normalizeStatus(search?.status ? String(search.status) : undefined),
    ),
  );

  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(search?.page ? Number(search.page) : 1),
  );

  const [perPage] = useQueryState(
    "per_page",
    parseAsInteger.withDefault(search?.per_page ? Number(search.per_page) : 30),
  );

  const [fromDateInUrl, setFromDateInUrl] = useQueryState(
    "from_date",
    parseAsString.withDefault(
      search?.from_date
        ? String(search.from_date)
        : search?.from
          ? String(search.from)
          : "",
    ),
  );

  const [toDateInUrl, setToDateInUrl] = useQueryState(
    "to_date",
    parseAsString.withDefault(
      search?.to_date
        ? String(search.to_date)
        : search?.to
          ? String(search.to)
          : "",
    ),
  );

  const [categoryInUrl, setCategoryInUrl] = useQueryState(
    "category_id",
    parseAsString.withDefault(
      search?.category_id ? String(search.category_id) : "all",
    ),
  );

  const [roomInUrl, setRoomInUrl] = useQueryState(
    "room_id",
    parseAsString.withDefault(search?.room_id ? String(search.room_id) : "all"),
  );

  const activeStatus = normalizeStatus(status);

  const dateRange = useMemo(
    () => parseDateRangeFromUrl(fromDateInUrl, toDateInUrl),
    [fromDateInUrl, toDateInUrl],
  );

  const categoryFilter = categoryInUrl || "all";
  const roomFilter = roomInUrl || "all";
  const selectedRoomId = roomFilter === "all" ? undefined : roomFilter;
  const selectedCategoryId =
    categoryFilter === "all" ? undefined : categoryFilter;

  const appliedFromDate = fromDateInUrl || undefined;
  const appliedToDate = toDateInUrl || fromDateInUrl || undefined;

  const queryParams = {
    page,
    per_page: perPage,
    status: activeStatus,
    vendor_location_id: session.data?.user?.vendor_location_id,
    search: search?.search,
    from_date: appliedFromDate,
    to_date: appliedToDate,
    category_id: selectedCategoryId,
    room_id: selectedRoomId,
  };

  const {
    data: eventsData,
    isLoading,
    isFetching,
    refetch,
  } = useEvents(queryParams as EventsQueryParams);

  const { mutate: bulkDeleteEvents, isPending: isBulkDeleting } =
    useBulkDeleteEvents();

  const events = eventsData?.items || [];
  const meta = eventsData?.meta || { last_page: 1, total: 0 };
  const filterMeta = eventsData?.filter_meta;
  const tabCounts = eventsData?.tab_counts ?? {
    active: 0,
    old: 0,
    draft: 0,
    cancelled: 0,
  };

  // undefined while the list is loading so the date picker can show a loading
  // state; [] once loaded with no selectable dates (not "still loading").
  const availableDates = useMemo(
    () =>
      isLoading && !eventsData
        ? undefined
        : (filterMeta?.available_dates ?? []),
    [filterMeta?.available_dates, isLoading, eventsData],
  );
  const availableCategories = useMemo(
    () => filterMeta?.available_categories ?? [],
    [filterMeta?.available_categories],
  );
  const availableRooms = useMemo(
    () => filterMeta?.available_rooms ?? [],
    [filterMeta?.available_rooms],
  );
  const hasRoomEvents = filterMeta?.has_room_events === true;

  const isDraftTab = activeStatus === "draft";
  const hasDraftEventsToSelect = events.length > 0;
  const showDraftBulkUi = isDraftTab && hasDraftEventsToSelect;

  const selectedDraftBreakdown = useMemo(() => {
    const picked = selectedEvents
      .map((id) => events.find((e) => e.id === id))
      .filter((e): e is EventItem => Boolean(e));
    return { total: picked.length };
  }, [selectedEvents, events]);

  const hasActiveFilters =
    !!fromDateInUrl ||
    categoryFilter !== "all" ||
    roomFilter !== "all";

  const handleDateRangeChange = useCallback(
    (range: DateRange | undefined) => {
      setFromDateInUrl(range?.from ? format(range.from, "yyyy-MM-dd") : "");
      setToDateInUrl(
        range?.to
          ? format(range.to, "yyyy-MM-dd")
          : range?.from
            ? format(range.from, "yyyy-MM-dd")
            : "",
      );
      setRoomInUrl("all");
    },
    [setFromDateInUrl, setToDateInUrl, setRoomInUrl],
  );

  const handleCategoryFilterChange = useCallback(
    (value: string) => {
      setCategoryInUrl(value);
    },
    [setCategoryInUrl],
  );

  const handleRoomFilterChange = useCallback(
    (value: string) => {
      setRoomInUrl(value);
    },
    [setRoomInUrl],
  );

  const handleResetFilters = useCallback(() => {
    setFromDateInUrl("");
    setToDateInUrl("");
    setCategoryInUrl("all");
    setRoomInUrl("all");
    setPage(1);
  }, [setCategoryInUrl, setFromDateInUrl, setPage, setRoomInUrl, setToDateInUrl]);

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedEvents([]);
    }
  };

  const toggleEventSelection = (id: number) => {
    setSelectedEvents((prev) =>
      prev.includes(id)
        ? prev.filter((eventId) => eventId !== id)
        : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedEvents.length === events.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(events.map((event) => event.id));
    }
  };

  const confirmBulkDelete = () => {
    if (selectedEvents.length === 0) return;
    bulkDeleteEvents(
      { event_ids: selectedEvents },
      {
        onSuccess: () => {
          setBulkDeleteDialogOpen(false);
          setSelectedEvents([]);
          setSelectionMode(false);
          refetch();
        },
      },
    );
  };

  useEffect(() => {
    if (status !== activeStatus) {
      setStatus(activeStatus);
    }
  }, [status, activeStatus, setStatus]);

  useEffect(() => {
    setPage(1);
    setSelectedEvents([]);
    if (activeStatus !== "draft") {
      setSelectionMode(false);
    }
  }, [activeStatus, setPage]);

  useEffect(() => {
    setPage(1);
  }, [fromDateInUrl, categoryFilter, roomFilter, setPage]);

  useEffect(() => {
    if (!fromDateInUrl) {
      if (roomFilter !== "all") setRoomInUrl("all");
      return;
    }

    if (roomFilter === "all") return;

    const isValidRoom = availableRooms.some(
      (room) => String(room.room_id) === roomFilter,
    );
    if (!isValidRoom) {
      setRoomInUrl("all");
    }
  }, [fromDateInUrl, availableRooms, roomFilter, setRoomInUrl]);

  useEffect(() => {
    if (categoryFilter === "all") return;
    if (!availableCategories.length) return;

    const isValidCategory = availableCategories.some(
      (category) => String(category.id) === categoryFilter,
    );
    if (!isValidCategory) {
      setCategoryInUrl("all");
    }
  }, [categoryFilter, availableCategories, setCategoryInUrl]);

  useEffect(() => {
    if (isDraftTab && events.length === 0) {
      setSelectionMode(false);
      setSelectedEvents([]);
    }
  }, [isDraftTab, events.length]);

  const renderEventGrid = () => {
    if (isLoading) {
      return <EventsTabSkeleton count={15} />;
    }

    if (events.length === 0) {
      return (
        <p className="w-full py-6 flex justify-center items-center text-sm sm:text-base">
          No Events Found
        </p>
      );
    }

    return (
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
        {events.map((event, idx) => (
          <Card
            key={`${event.id}-${idx}`}
            className="shadow-none border-none pt-0 pb-1 px-0"
          >
            <CardContent className="px-0">
              <EventCard
                event={event}
                selectionMode={showDraftBulkUi && selectionMode}
                selected={selectedEvents.includes(event.id)}
                onSelect={() => toggleEventSelection(event.id)}
              />
            </CardContent>
          </Card>
        ))}
      </section>
    );
  };

  return (
    <section className="w-full flex flex-col relative rounded-md text-black min-w-0">
      <header
        className={cn(
          pageCardClassName("mb-4 min-w-0"),
          "flex flex-col gap-4",
        )}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-3 w-full sm:flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl title-header text-black font-bold shrink-0">
                <LocationScopedTitle title="Events" fallback="All Events" />
              </h2>
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
            <PermissionGuard permissionKey="create-event">
              <Button
                asChild
                size="sm"
                variant="event-primary"
                className="flex-1 gap-1.5 font-semibold sm:flex-none"
              >
                <Link href="/vendor/events/create">
                  <PlusCircle className="h-4 w-4 shrink-0" />
                  Create Event
                </Link>
              </Button>
            </PermissionGuard>
            {showDraftBulkUi && !selectionMode && (
              <PermissionGuard permissionKey="update-event">
                <Button
                  size="sm"
                  onClick={toggleSelectionMode}
                  variant="event-outline"
                  className="flex-1 sm:flex-none"
                >
                  <span className="hidden sm:inline">Select Events</span>
                  <span className="sm:hidden">Select</span>
                </Button>
              </PermissionGuard>
            )}
          </div>
        </div>

        <EventListFilters
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          availableDates={availableDates}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={handleCategoryFilterChange}
          availableCategories={availableCategories}
          roomFilter={roomFilter}
          onRoomFilterChange={handleRoomFilterChange}
          availableRooms={availableRooms}
          hasRoomEvents={hasRoomEvents}
          disabled={isFetching}
          onReset={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </header>

      {showDraftBulkUi && selectionMode && (
        <PermissionGuard permissionKey="update-event">
          <div className="bg-muted/20 p-2 sm:p-3 mb-4 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center">
              <Checkbox
                id="select-all"
                checked={
                  selectedEvents.length > 0 &&
                  selectedEvents.length === events.length
                }
                onCheckedChange={toggleSelectAll}
                className="mr-2"
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                {selectedEvents.length > 0
                  ? `${selectedEvents.length} of ${events.length} selected`
                  : "Select All"}
              </label>
            </div>

            <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-2">
              <Button
                size="sm"
                onClick={toggleSelectionMode}
                variant="event-outline"
                className="flex-1 sm:flex-none"
              >
                <span className="hidden sm:inline">Exit Selection</span>
                <span className="sm:hidden">Exit</span>
              </Button>
              <Button
                className="flex items-center gap-1 flex-1 sm:flex-none"
                variant="destructive"
                size="sm"
                disabled={selectedEvents.length === 0 || isBulkDeleting}
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete selected</span>
                <span className="sm:hidden">Delete</span>
              </Button>
            </div>
          </div>
        </PermissionGuard>
      )}

      <main className="min-w-0">
        <Tabs
          className="p-0"
          value={activeStatus}
          onValueChange={(newStatus) => setStatus(newStatus)}
        >
          <TabsList className="h-auto mb-6 w-full gap-1 overflow-x-auto rounded-lg bg-slate-100/80 p-1 flex-wrap no-scrollbar">
            {tabs.map((key) => {
              const count = tabCounts[key];
              const hasItems = count > 0;

              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="group h-9 gap-2 rounded-md border-0 px-3 py-2 text-xs font-medium text-slate-600 data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm sm:text-sm"
                >
                  <span className="hidden sm:inline">
                    {tabLabels[key]} Events
                  </span>
                  <span className="sm:hidden">{tabLabels[key]}</span>
                  <span
                    className={
                      hasItems
                        ? "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 text-[11px] font-bold tabular-nums leading-none text-white shadow-sm group-data-[state=active]:bg-white group-data-[state=active]:text-[var(--color-primary)]"
                        : "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-200/90 px-1.5 text-[11px] font-semibold tabular-nums leading-none text-slate-500 group-data-[state=active]:bg-white/25 group-data-[state=active]:text-white"
                    }
                  >
                    {count}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabs.map((key) => (
            <TabsContent key={key} value={key}>
              {renderEventGrid()}
            </TabsContent>
          ))}
        </Tabs>

        <section className="w-full my-6">
          <EventPagination
            currentPage={page}
            setPage={setPage}
            totalPages={meta.last_page || 1}
          />
        </section>
      </main>

      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected draft events?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-sm text-muted-foreground">
                <p>
                  You are about to permanently remove{" "}
                  <span className="font-semibold text-foreground">
                    {selectedDraftBreakdown.total}
                  </span>{" "}
                  {selectedDraftBreakdown.total === 1 ? "event" : "events"}{" "}
                  from your account. Customers will no longer see these events,
                  and this cannot be undone.
                </p>
                <p className="text-xs">
                  If you are unsure, choose Cancel and review your selection
                  before proceeding.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isBulkDeleting}
              className="sm:ml-2"
              onClick={() => confirmBulkDelete()}
            >
              {isBulkDeleting ? "Deleting…" : "Delete events"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
