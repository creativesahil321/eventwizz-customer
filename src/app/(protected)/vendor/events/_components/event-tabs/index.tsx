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
import { useState, useEffect, useMemo } from "react";
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

const tabs = ["all", "active", "old", "draft", "cancelled"];
const tabLabels: Record<string, string> = {
  all: "All",
  active: "Active",
  old: "Past",
  draft: "Draft",
  cancelled: "Cancelled",
};

type EventsProps = {
  search: SearchParams;
};

export default function EventTabs({ search }: EventsProps) {
  const session = useSession();
  const queryClient = useQueryClient();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<number[]>([]);

  // Confirmation modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "active" | "refresh" | null
  >(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Query state for filters and pagination
  const [status, setStatus] = useQueryState(
    "status",
    parseAsString.withDefault(search?.status ? String(search.status) : "all"),
  );

  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(search?.page ? Number(search.page) : 1),
  );

  const [perPage] = useQueryState(
    "per_page",
    parseAsInteger.withDefault(search?.per_page ? Number(search.per_page) : 30),
  );

  // Format API query params
  const queryParams = {
    page,
    per_page: perPage,
    status: status !== "all" ? status : "",
    vendor_location_id: session.data?.user?.vendor_location_id,
    search: search?.search,
  };

  // Fetch events with TanStack Query
  const {
    data: eventsData,
    isLoading,
    refetch,
  } = useEvents(queryParams as EventsQueryParams);

  // Bulk update mutation
  const { mutate: bulkUpdateStatus, isPending: isUpdating } =
    useBulkUpdateEventStatus();

  const { mutate: bulkDeleteEvents, isPending: isBulkDeleting } =
    useBulkDeleteEvents();

  // Extract items and meta from the response
  const events = eventsData?.items || [];
  const meta = eventsData?.meta || { last_page: 1, total: 0 };

  /** Bulk select, Set Active, Delete — Draft tab only (list is already drafts) */
  const isDraftTab = status === "draft";
  const hasDraftEventsToSelect = events.length > 0;
  const showDraftBulkUi = isDraftTab && hasDraftEventsToSelect;

  /** Selected rows count (draft tab bulk actions). */
  const selectedDraftBreakdown = useMemo(() => {
    const picked = selectedEvents
      .map((id) => events.find((e) => e.id === id))
      .filter((e): e is EventItem => Boolean(e));
    return { total: picked.length };
  }, [selectedEvents, events]);

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    // Clear selections when disabling selection mode
    if (selectionMode) {
      setSelectedEvents([]);
    }
  };

  // Toggle selection of an event
  const toggleEventSelection = (id: number) => {
    setSelectedEvents((prev) =>
      prev.includes(id)
        ? prev.filter((eventId) => eventId !== id)
        : [...prev, id],
    );
  };

  // Toggle select all events
  const toggleSelectAll = () => {
    if (selectedEvents.length === events.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(events.map((event) => event.id));
    }
  };

  // Check if any selected events are cancelled
  const hasCancelledEvents = selectedEvents.some((eventId) => {
    const event = events.find((e) => e.id === eventId);
    return event?.status === "cancelled";
  });

  // Bulk set active (draft tab only — no "Set Draft" here; everything is already draft)
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

  // Execute the confirmed action
  const executeBulkAction = () => {
    if (!pendingAction) return;

    if (pendingAction === "refresh") {
      console.log("Manually refreshing data");
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

  // Cancel confirmation modal
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
      }
    );
  };

  // Reset page to 1 when changing tabs; exit bulk mode when leaving Draft
  useEffect(() => {
    setPage(1);
    setSelectedEvents([]);
    if (status !== "draft") {
      setSelectionMode(false);
    }
  }, [status, setPage]);

  // No rows — hide bulk UI and exit selection (e.g. after deleting last drafts)
  useEffect(() => {
    if (isDraftTab && events.length === 0) {
      setSelectionMode(false);
      setSelectedEvents([]);
    }
  }, [isDraftTab, events.length]);

  // Force a refetch of the data immediately
  const refreshData = () => {
    // Invalidate the query cache to ensure fresh data
    queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    // Refetch the current query
    refetch();
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
          >
            <RefreshCcw size={14} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </header>

      {/* Bulk actions: Draft tab + has rows + selection mode */}
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
                  ⚠️ Cancelled events cannot be set to active
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
        <Tabs
          className="p-0"
          defaultValue={status}
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
                  {tabLabels[key] ?? key} Events
                </span>
                <span className="sm:hidden">
                  {tabLabels[key] ?? key}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((key) => (
            <TabsContent key={key} value={key}>
              {isLoading ? (
                <EventsTabSkeleton count={15} />
              ) : events && events.length === 0 ? (
                <p className="w-full py-6 flex justify-center items-center text-sm sm:text-base">
                  No Events Found
                </p>
              ) : (
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
                  {events?.map((event, idx) => (
                    <Card
                      key={`${event.id}-${idx}`}
                      className={`shadow-none border-none pt-0 pb-1 px-0`}
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
              )}
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

      {/* Confirmation Modal */}
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
