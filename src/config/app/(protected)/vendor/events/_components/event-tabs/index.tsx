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
  useBulkUpdateEventStatus,
  useBulkDeleteEvents,
  eventKeys,
} from "../../_lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import EventPagination from "./event-pagination";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Check, Trash2 } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { EventItem, EventsQueryParams } from "@/services/vendor/events/type";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LocationIndicator } from "@/components/location-indicator";
import { PermissionGuard } from "@/components/permission/PermissionGuard";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";

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
  const queryClient = useQueryClient();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<number[]>([]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "active" | "refresh" | null
  >(null);
  const [confirmMessage, setConfirmMessage] = useState("");
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

  const isActiveTab = activeStatus === "active";
  const appliedFromDate =
    isActiveTab && fromDateInUrl ? fromDateInUrl : undefined;
  const appliedToDate = isActiveTab
    ? toDateInUrl || fromDateInUrl || undefined
    : undefined;

  const queryParams = {
    page,
    per_page: perPage,
    status: activeStatus,
    vendor_location_id: session.data?.user?.vendor_location_id,
    search: search?.search,
    from_date: appliedFromDate,
    to_date: appliedToDate,
    category_id: isActiveTab ? selectedCategoryId : undefined,
    room_id: isActiveTab ? selectedRoomId : undefined,
  };

  const {
    data: eventsData,
    isLoading,
    isFetching,
    refetch,
  } = useEvents(queryParams as EventsQueryParams);

  const { mutate: bulkUpdateStatus, isPending: isUpdating } =
    useBulkUpdateEventStatus();

  const { mutate: bulkDeleteEvents, isPending: isBulkDeleting } =
    useBulkDeleteEvents();

  const events = eventsData?.items || [];
  const meta = eventsData?.meta || { last_page: 1, total: 0 };
  const filterMeta = eventsData?.filter_meta;

  const availableDates = useMemo(
    () => filterMeta?.available_dates ?? [],
    [filterMeta?.available_dates],
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

  const hasCancelledEvents = selectedEvents.some((eventId) => {
    const event = events.find((e) => e.id === eventId);
    return event?.status === "cancelled";
  });

  const handleBulkSetActive = () => {
    if (selectedEvents.length === 0 || hasCancelledEvents) return;

    setPendingAction("active");
    setConfirmMessage(
      `Are you sure you want to set active ${
        selectedEvents.length
      } event${selectedEvents.length > 1 ? "s" : ""}? This will make them visible to customers.`,
    );
    setShowConfirmModal(true);
  };

  const executeBulkAction = () => {
    if (!pendingAction) return;

    if (pendingAction === "refresh") {
      refetch();
      setSelectedEvents([]);
      setShowConfirmModal(false);
      setPendingAction(null);
      return;
    }

    if (selectedEvents.length === 0) return;

    bulkUpdateStatus(
      {
        event_ids: selectedEvents,
        action: pendingAction,
      },
      {
        onSuccess: () => {
          setSelectedEvents([]);
          refetch();
          setShowConfirmModal(false);
          setPendingAction(null);
        },
      },
    );
  };

  const cancelBulkAction = () => {
    setShowConfirmModal(false);
    setPendingAction(null);
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
    if (!isActiveTab) return;
    setPage(1);
  }, [fromDateInUrl, categoryFilter, roomFilter, isActiveTab, setPage]);

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

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    refetch();
  };

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
    <section className="w-full bg-background flex flex-col relative rounded-md text-black">
      <header className="bg-background p-4 sm:p-6 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-3 w-full sm:flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl title-header text-black font-bold shrink-0">
              All Events
            </h2>
            {showDraftBulkUi && (
              <PermissionGuard permissionKey="update-event">
                <Button
                  size="sm"
                  onClick={toggleSelectionMode}
                  variant={selectionMode ? "event-outline" : "event-primary"}
                  className="w-fit shrink-0"
                >
                  <span className="hidden sm:inline">
                    {selectionMode ? "Exit Selection" : "Select Events"}
                  </span>
                  <span className="sm:hidden">
                    {selectionMode ? "Exit" : "Select"}
                  </span>
                </Button>
              </PermissionGuard>
            )}
          </div>
          <LocationIndicator variant="card" />
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:shrink-0">
          <Button
            className="text-black flex items-center gap-1 flex-1 sm:flex-none"
            size="sm"
            onClick={refreshData}
            variant="outline"
            disabled={isFetching}
          >
            <RefreshCcw
              size={14}
              className={isFetching ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </header>

      {showDraftBulkUi && selectionMode && (
        <PermissionGuard permissionKey="update-event">
          <div className="bg-muted/20 p-2 sm:p-3 mb-4 rounded-md mx-2 sm:mx-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-1 min-w-0">
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
              {hasCancelledEvents && (
                <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                  Cancelled events cannot be set to active
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
              <Button
                className="flex items-center gap-1 flex-1 sm:flex-none"
                variant="event-primary"
                size="sm"
                disabled={
                  selectedEvents.length === 0 ||
                  isUpdating ||
                  isBulkDeleting ||
                  hasCancelledEvents
                }
                onClick={() => handleBulkSetActive()}
                title={
                  hasCancelledEvents
                    ? "Cannot set cancelled events to active"
                    : ""
                }
              >
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">Set Active</span>
                <span className="sm:hidden">Active</span>
              </Button>

              <Button
                className="flex items-center gap-1 flex-1 sm:flex-none"
                variant="destructive"
                size="sm"
                disabled={
                  selectedEvents.length === 0 ||
                  isUpdating ||
                  isBulkDeleting ||
                  hasCancelledEvents
                }
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

      <main className="bg-background p-2 sm:p-4 md:p-6 rounded-md">
        {isActiveTab && (
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
        )}

        <Tabs
          className="p-0"
          value={activeStatus}
          onValueChange={(newStatus) => setStatus(newStatus)}
        >
          <TabsList className="h-auto mb-6 w-full overflow-x-auto flex-wrap no-scrollbar">
            {tabs.map((key) => (
              <TabsTrigger
                key={key}
                value={key}
                className="p-2 border-0 cursor-pointer text-black text-xs sm:text-sm whitespace-nowrap"
              >
                <span className="hidden sm:inline">
                  {tabLabels[key]} Events
                </span>
                <span className="sm:hidden">{tabLabels[key]}</span>
              </TabsTrigger>
            ))}
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

      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelBulkAction}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
