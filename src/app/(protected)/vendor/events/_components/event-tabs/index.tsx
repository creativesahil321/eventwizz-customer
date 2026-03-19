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
  eventKeys,
} from "../../_lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import EventPagination from "./event-pagination";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Check, X, FileEdit } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { EventsQueryParams } from "@/services/vendor/events/type";
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
    "active" | "draft" | "cancelled" | "refresh" | null
  >(null);
  const [confirmMessage, setConfirmMessage] = useState("");

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

  // Extract items and meta from the response
  const events = eventsData?.items || [];
  const meta = eventsData?.meta || { last_page: 1, total: 0 };

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

  // Handle bulk status update with confirmation
  const handleBulkStatusUpdate = (action: "active" | "draft" | "cancelled") => {
    if (selectedEvents.length === 0) return;

    // Prevent reactivating or drafting cancelled events
    if ((action === "active" || action === "draft") && hasCancelledEvents) {
      return; // Do nothing - buttons will be disabled
    }

    // Set confirmation modal data
    const actionLabels = {
      active: "Set Active",
      draft: "Set Draft",
      cancelled: "Set Cancelled",
    };

    const actionDescriptions = {
      active:
        "This will set the selected events as active and make them visible to customers.",
      draft:
        "This will set the selected events as draft and hide them from customers.",
      cancelled:
        "This will cancel the selected events and they will no longer be available for booking.",
    };

    setPendingAction(action);
    setConfirmMessage(
      `Are you sure you want to ${actionLabels[action].toLowerCase()} ${
        selectedEvents.length
      } event${selectedEvents.length > 1 ? "s" : ""}? ${
        actionDescriptions[action]
      }`,
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

  // Reset page to 1 when changing tabs
  useEffect(() => {
    setPage(1);
    // Clear selection when changing tabs
    setSelectedEvents([]);
  }, [status, setPage]);

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
        <div className="flex flex-col gap-3 w-full sm:w-auto">
          <h2 className="text-xl sm:text-2xl title-header text-black font-bold">
            All Events
          </h2>
          <LocationIndicator variant="card" />
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <PermissionGuard permissionKey="update-event">
            <Button
              size="sm"
              onClick={toggleSelectionMode}
              variant={selectionMode ? "event-outline" : "event-primary"}
              className="flex-1 sm:flex-none"
            >
              <span className="hidden sm:inline">
                {selectionMode ? "Exit Selection" : "Select Events"}
              </span>
              <span className="sm:hidden">
                {selectionMode ? "Exit" : "Select"}
              </span>
            </Button>
          </PermissionGuard>

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

      {/* Bulk Actions Bar - visible only in selection mode */}
      {selectionMode && (
        <PermissionGuard permissionKey="update-event">
          <div className="bg-muted/20 p-2 sm:p-3 mb-4 rounded-md mx-2 sm:mx-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-2 w-full sm:w-auto">
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
                  ⚠️ Cancelled events cannot be reactivated or drafted
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {status !== "active" && (
                <Button
                  className="flex items-center gap-1 flex-1 sm:flex-none"
                  variant="event-primary"
                  size="sm"
                  disabled={
                    selectedEvents.length === 0 ||
                    isUpdating ||
                    hasCancelledEvents
                  }
                  onClick={() => handleBulkStatusUpdate("active")}
                  title={
                    hasCancelledEvents
                      ? "Cannot reactivate cancelled events"
                      : ""
                  }
                >
                  <Check className="h-4 w-4" />
                  <span className="hidden sm:inline">Set Active</span>
                  <span className="sm:hidden">Active</span>
                </Button>
              )}

              {status !== "draft" && (
                <Button
                  className="flex items-center gap-1 flex-1 sm:flex-none"
                  variant="event-secondary"
                  size="sm"
                  disabled={
                    selectedEvents.length === 0 ||
                    isUpdating ||
                    hasCancelledEvents
                  }
                  onClick={() => handleBulkStatusUpdate("draft")}
                  title={
                    hasCancelledEvents
                      ? "Cannot draft cancelled events"
                      : ""
                  }
                >
                  <FileEdit className="h-4 w-4" />
                  <span className="hidden sm:inline">Set Draft</span>
                  <span className="sm:hidden">Draft</span>
                </Button>
              )}

              {status !== "cancelled" && (
                <Button
                  className="flex items-center gap-1 flex-1 sm:flex-none"
                  variant="destructive"
                  size="sm"
                  disabled={selectedEvents.length === 0 || isUpdating}
                  onClick={() => handleBulkStatusUpdate("cancelled")}
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Set Cancelled</span>
                  <span className="sm:hidden">Cancel</span>
                </Button>
              )}
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
                          selectionMode={selectionMode}
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
    </section>
  );
}
