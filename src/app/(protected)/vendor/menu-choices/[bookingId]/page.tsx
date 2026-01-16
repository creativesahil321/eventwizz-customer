"use client";

import {
  Suspense,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  use,
} from "react";
import MenuSelectionForm from "../_components/menu-selection-form";
import {
  MenuChoicesPageSkeleton,
  MenuSelectionFormSkeleton,
} from "../_components/menu-choices-skeleton";
import AttendeeList from "../_components/attendee-list";
import DateSwitcher from "../_components/date-switcher";
import TableSwitcher from "../_components/table-switcher";
import { AlertCircle, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AttendeeMenuSelection,
  MenuBooking,
  MenuBookingDate,
  TableInfo,
} from "../_lib/types";
import {
  getBookingDateInfo,
  getTableInfo,
  getCategoryOrder,
  mapMenuSelectionsToLegacy,
  mapMenuSelectionsToChoicesArray,
} from "../_lib/utils";
import {
  useVendorMenuItems,
  useSaveVendorMenuChoice,
} from "@/services/vendor/bookings/query";
import { useVendorBookingById } from "@/services/vendor/bookings/hooks/useVendorBookingById";
import { MenuTable } from "@/services/customer/bookings/type";
import { vendorBookingsService } from "@/services/vendor/bookings/bookings.service";

interface MenuChoicesPageProps {
  readonly params: Promise<{
    bookingId: string;
  }>;
}

function MenuChoicesContent({ params }: MenuChoicesPageProps) {
  // Unwrap params Promise using React.use()
  const { bookingId: bookingIdParam } = use(params);

  // Get bookingId from route params
  const bookingId = Number.parseInt(bookingIdParam) || 0;

  // State for selected date and table
  const [selectedDateKey, setSelectedDateKey] = useState<string>("");
  const [selectedTableId, setSelectedTableId] = useState<string>("");

  // Fetch vendor booking details
  const { data: vendorBookingData } = useVendorBookingById(bookingId);

  // Get current booking from vendor booking details
  const currentBooking = vendorBookingData?.data;

  // Convert selectedTableId (string) to numeric for API calls
  const selectedTableIdNumeric = useMemo(() => {
    if (!selectedTableId) return undefined;
    const parsed = Number.parseInt(selectedTableId);
    return !Number.isNaN(parsed) && parsed > 0 ? parsed : undefined;
  }, [selectedTableId]);

  // Fetch menu items for the selected date and table
  const { data: menuItemsData, isLoading: isLoadingMenuItems } =
    useVendorMenuItems(
      bookingId,
      selectedDateKey,
      selectedTableIdNumeric,
      !!bookingId && !!selectedDateKey && !!selectedTableIdNumeric
    );

  // Save menu choice mutation (saves immediately on add/update)
  const saveMenuChoiceMutation = useSaveVendorMenuChoice();

  // Transform API data to MenuBooking format from vendor booking details
  const bookingData = useMemo<MenuBooking | null>(() => {
    if (!currentBooking) return null;

    // Transform event_dates to MenuBookingDate format
    const dates: MenuBookingDate[] = currentBooking.event_dates
      .map((eventDate) => {
        // Get tables from menu items API if available, otherwise use booking data
        let tables: TableInfo[] = [];

        if (
          menuItemsData?.data?.tables &&
          eventDate.date_key === selectedDateKey
        ) {
          // Use tables from menu items API (has actual table IDs and allocated_seat)
          tables = menuItemsData.data.tables.map(
            (table: MenuTable, index: number) => ({
              table_id: table.id.toString(),
              table_name: `Table ${index + 1}`,
              seats: table.table_size,
              guests: table.allocated_seat,
            })
          );
        } else if (eventDate.tables && eventDate.tables.length > 0) {
          // Use tables from vendor booking data
          // Extract table IDs from allocation
          const firstTable = eventDate.tables[0];
          if (firstTable.allocation) {
            tables = Object.entries(firstTable.allocation).map(
              ([tableId, people], index) => ({
                table_id: tableId,
                table_name: `Table ${index + 1}`,
                seats: firstTable.table_size,
                guests: people,
              })
            );
          }
        }

        return {
          date_key: eventDate.date_key,
          date: eventDate.date,
          tables,
          tickets: 0,
          drinks: 0,
          status: eventDate.payment_status.toLowerCase(),
        };
      })
      // Filter out dates with no tables
      .filter((date) => date.tables.length > 0);

    // Calculate total guests
    const totalGuests = dates.reduce(
      (sum, date) =>
        sum +
        date.tables.reduce((tableSum, table) => tableSum + table.guests, 0),
      0
    );

    return {
      booking_id: currentBooking.booking_id,
      booking_number: currentBooking.booking_number,
      event_name: currentBooking.event_name,
      event_image: "",
      dates,
      total_guests: totalGuests,
    };
  }, [currentBooking, menuItemsData, selectedDateKey]);

  // Get booking number for display
  const bookingNumber = currentBooking?.booking_number;

  // Editing state
  const [editingAttendee, setEditingAttendee] =
    useState<AttendeeMenuSelection | null>(null);

  // Ref to prevent double duplication
  const isDuplicatingRef = useRef<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // Download menu choices state
  const [downloadingMenuChoices, setDownloadingMenuChoices] = useState(false);

  // Track pending saves to prevent exceeding capacity during async operations
  const pendingSavesCountRef = useRef<number>(0);

  /**
   * Transform persisted menu choices from API directly to AttendeeMenuSelection[]
   * Filters by selected date and table_id automatically
   * Uses menu_choices from API response - data persists automatically
   */
  const transformedMenuSelections = useMemo<AttendeeMenuSelection[]>(() => {
    if (
      !menuItemsData?.data?.menu_choices ||
      !selectedDateKey ||
      !selectedTableIdNumeric
    ) {
      return [];
    }

    const menuItemsForDate = menuItemsData.data.event_menu || [];
    const categoryOrder = getCategoryOrder(menuItemsForDate);

    // Filter choices for current date and table_id
    const persistedChoices = menuItemsData.data.menu_choices.filter(
      (choice) =>
        choice.table_id === selectedTableIdNumeric &&
        (choice.date_key === selectedDateKey || choice.date_key === null)
    );

    if (persistedChoices.length === 0) {
      return [];
    }

    // Transform persisted menu choices to AttendeeMenuSelection format
    return persistedChoices.map((choice) => {
      const menuSelections = choice.menu_selections || {};
      const legacyFields = mapMenuSelectionsToLegacy(
        menuSelections,
        categoryOrder
      );

      return {
        id: choice.id.toString(),
        booking_id: bookingId,
        date_key: choice.date_key || selectedDateKey,
        table_id: choice.table_id.toString(),
        title: choice.title,
        fullName: choice.full_name,
        menuSelections: menuSelections,
        ...legacyFields,
        allergens: choice.allergens || [],
        dietaryRequirements: choice.dietary_requirements || [],
        additionalNotes: choice.additional_notes || "",
        status: "completed",
      } as AttendeeMenuSelection;
    });
  }, [menuItemsData, selectedDateKey, selectedTableIdNumeric, bookingId]);

  // Initialize selected date to first date that has tables
  useEffect(() => {
    if (currentBooking && currentBooking.event_dates.length > 0) {
      // Find first date with tables
      const firstDate = currentBooking.event_dates.find(
        (d) => d.tables && d.tables.length > 0
      );

      if (
        firstDate &&
        (!selectedDateKey || selectedDateKey !== firstDate.date_key)
      ) {
        setSelectedDateKey(firstDate.date_key);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBooking]);

  // Initialize selected table when date changes
  useEffect(() => {
    if (!selectedDateKey || !currentBooking) return;

    const eventDate = currentBooking.event_dates.find(
      (d) => d.date_key === selectedDateKey
    );

    if (eventDate?.tables && eventDate.tables.length > 0) {
      const firstTable = eventDate.tables[0];
      if (firstTable.allocation) {
        const firstTableId = Object.keys(firstTable.allocation)[0];
        if (!selectedTableId && firstTableId) {
          setSelectedTableId(firstTableId);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateKey, currentBooking]);

  // Get current date and table info
  const currentDateInfo = useMemo(() => {
    if (!bookingData) return undefined;
    return getBookingDateInfo(bookingData, selectedDateKey);
  }, [bookingData, selectedDateKey]);

  const currentTableInfo = useMemo(() => {
    if (!bookingData) return undefined;
    return getTableInfo(bookingData, selectedDateKey, selectedTableId);
  }, [bookingData, selectedDateKey, selectedTableId]);

  // Get attendees directly from API response
  const currentAttendees = transformedMenuSelections;

  // Get total guests for current table
  const totalGuests = currentTableInfo?.guests || 0;

  // Check if table is full
  const isTableFull =
    currentAttendees.length + pendingSavesCountRef.current >= totalGuests;

  /**
   * Handle date selection change
   */
  const handleDateChange = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setSelectedTableId("");
    setEditingAttendee(null);
  };

  /**
   * Handle table selection change
   */
  const handleTableChange = (tableId: string) => {
    setSelectedTableId(tableId);
    setEditingAttendee(null);
  };

  /**
   * Save attendee menu selection
   */
  const handleSaveAttendee = useCallback(
    async (
      attendeeData: Omit<
        AttendeeMenuSelection,
        "id" | "booking_id" | "date_key" | "table_id"
      >
    ) => {
      const menuItemsForDate = menuItemsData?.data?.event_menu || [];
      const menuSelections = attendeeData.menuSelections || {};

      const choices = mapMenuSelectionsToChoicesArray(
        menuSelections,
        menuItemsForDate
      );

      if (choices.length === 0) {
        toast.error("Please select at least one menu item");
        return;
      }

      if (!selectedTableIdNumeric) {
        toast.error("Could not determine table ID");
        return;
      }

      const actualTableId = selectedTableIdNumeric;
      const noOfAttendees = totalGuests || currentTableInfo?.guests || 0;

      if (noOfAttendees === 0) {
        toast.error("Could not determine number of attendees");
        return;
      }

      const payload = {
        booking_id: bookingId,
        table_id: actualTableId,
        no_of_attendees: noOfAttendees,
        title: attendeeData.title,
        name: attendeeData.fullName,
        ...(editingAttendee?.id && {
          menu_choice_id: Number.parseInt(editingAttendee.id),
        }),
        choices: choices,
        allergens: attendeeData.allergens || [],
        dietary_requirements: attendeeData.dietaryRequirements || [],
        additional_notes: attendeeData.additionalNotes || "",
      };

      pendingSavesCountRef.current += 1;

      try {
        await saveMenuChoiceMutation.mutateAsync(payload);
        setEditingAttendee(null);
      } catch (error) {
        console.error("Error saving menu choice:", error);
      } finally {
        pendingSavesCountRef.current = Math.max(
          0,
          pendingSavesCountRef.current - 1
        );
      }
    },
    [
      bookingId,
      selectedTableIdNumeric,
      menuItemsData,
      saveMenuChoiceMutation,
      totalGuests,
      currentTableInfo,
      editingAttendee,
    ]
  );

  /**
   * Edit an existing attendee
   */
  const handleEditAttendee = useCallback((attendee: AttendeeMenuSelection) => {
    setEditingAttendee(attendee);
  }, []);

  /**
   * Cancel edit
   */
  const handleCancelEdit = useCallback(() => {
    setEditingAttendee(null);
  }, []);

  /**
   * Generate unique duplicate name
   */
  const generateUniqueDuplicateName = useCallback(
    (baseName: string, existingAttendees: AttendeeMenuSelection[]): string => {
      const baseNameClean = baseName
        .replace(/\s*\(Copy(?:\s+\d+)?\)\s*$/, "")
        .trim();

      const escapedBaseName = baseNameClean.replaceAll(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      const copyPattern = new RegExp(
        `^${escapedBaseName}\\s*\\(Copy(?:\\s+(\\d+))?\\)$`
      );

      const existingCopyNumbers: number[] = [];
      for (const attendee of existingAttendees) {
        const match = copyPattern.exec(attendee.fullName);
        if (match) {
          const copyNum = match[1] ? Number.parseInt(match[1], 10) : 1;
          existingCopyNumbers.push(copyNum);
        }
      }

      existingCopyNumbers.sort((a, b) => b - a);
      const nextCopyNumber =
        existingCopyNumbers.length > 0 ? existingCopyNumbers[0] + 1 : 1;

      return nextCopyNumber === 1
        ? `${baseNameClean} (Copy)`
        : `${baseNameClean} (Copy ${nextCopyNumber})`;
    },
    []
  );

  /**
   * Handle table full error
   */
  const handleTableFullError = useCallback(() => {
    toast.error("Table is full", {
      description: "Cannot duplicate. Please edit an existing attendee first.",
      duration: 5000,
    });
    isDuplicatingRef.current = null;
    setDuplicatingId(null);
  }, []);

  /**
   * Duplicate attendee
   */
  const handleDuplicateAttendee = useCallback(
    async (attendee: AttendeeMenuSelection) => {
      if (isDuplicatingRef.current !== null) {
        return;
      }

      const duplicateKey = `${attendee.id}-duplicate`;
      isDuplicatingRef.current = duplicateKey;
      setDuplicatingId(attendee.id);

      try {
        const effectiveCount =
          currentAttendees.length + pendingSavesCountRef.current;

        if (effectiveCount >= totalGuests) {
          handleTableFullError();
          return;
        }

        const finalEffectiveCount =
          currentAttendees.length + pendingSavesCountRef.current + 1;
        if (finalEffectiveCount > totalGuests) {
          handleTableFullError();
          return;
        }

        const duplicatedAttendeeData = {
          title: attendee.title,
          fullName: generateUniqueDuplicateName(
            attendee.fullName,
            currentAttendees
          ),
          menuSelections: attendee.menuSelections,
          starter: attendee.starter,
          mainCourse: attendee.mainCourse,
          dessert: attendee.dessert,
          sides: attendee.sides,
          allergens: attendee.allergens || [],
          dietaryRequirements: attendee.dietaryRequirements || [],
          additionalNotes: attendee.additionalNotes || "",
          status: "completed" as const,
        };

        await handleSaveAttendee(duplicatedAttendeeData);
      } catch (error) {
        console.error("Failed to duplicate attendee:", error);
      } finally {
        isDuplicatingRef.current = null;
        setDuplicatingId(null);
      }
    },
    [
      generateUniqueDuplicateName,
      currentAttendees,
      handleSaveAttendee,
      totalGuests,
      handleTableFullError,
    ]
  );

  /**
   * Get current table progress
   */
  const currentTableProgress = useMemo(() => {
    if (!currentTableInfo) {
      return { completed: 0, total: 0 };
    }

    const completed = currentAttendees.length;
    const total = currentTableInfo.guests;

    return { completed, total };
  }, [currentAttendees, currentTableInfo]);

  /**
   * Handle download menu choices CSV
   */
  const handleDownloadMenuChoices = useCallback(async () => {
    if (!selectedDateKey) {
      toast.error("Please select a date");
      return;
    }

    setDownloadingMenuChoices(true);

    try {
      await vendorBookingsService.exportMenuChoices(bookingId, selectedDateKey);
      toast.success("Menu choices downloaded successfully");
    } catch (error) {
      console.error("Error downloading menu choices:", error);
      toast.error("Failed to download menu choices");
    } finally {
      setDownloadingMenuChoices(false);
    }
  }, [bookingId, selectedDateKey]);

  // Show loading if booking data not available
  if (!currentBooking || !bookingData) {
    return <MenuChoicesPageSkeleton />;
  }

  // If no dates have tables allocated
  if (bookingData?.dates?.length === 0) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
          <div>
            <p className="text-lg font-semibold mb-2">No Tables Allocated</p>
            <p className="text-sm text-muted-foreground">
              This booking doesn&apos;t have any table allocations yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Wait for date to be initialized
  if (bookingData && !selectedDateKey) {
    return <MenuChoicesPageSkeleton />;
  }

  // Check if the selected date has tables
  const currentDateHasTables =
    currentDateInfo && currentDateInfo.tables.length > 0;

  // Wait for table to be initialized
  if (
    bookingData &&
    selectedDateKey &&
    currentDateHasTables &&
    !selectedTableId
  ) {
    return <MenuChoicesPageSkeleton />;
  }

  return (
    <section className="w-full relative flex flex-col space-y-5">
      {/* Header Card */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm p-4 sm:p-6">
        <div className="flex items-center mb-4">
          <h1 className="text-2xl title-header font-bold">Menu Choices</h1>
        </div>

        {/* Event Info and Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">
              Manage menu selections for {bookingData.event_name}
              {bookingNumber && (
                <span className="font-medium text-foreground ml-1">
                  (Booking #{bookingNumber})
                </span>
              )}
            </p>
          </div>
          {/* Current Table Progress Indicator */}
          {currentTableProgress.total > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:min-w-[220px]">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                This Table:
              </span>
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <div className="flex-1 sm:w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{
                      width: `${
                        (currentTableProgress.completed /
                          currentTableProgress.total) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                  {currentTableProgress.completed}/{currentTableProgress.total}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Date/Table Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {bookingData.dates.length > 1 && (
              <DateSwitcher
                dates={bookingData.dates}
                selectedDateKey={selectedDateKey}
                onDateChange={handleDateChange}
              />
            )}
            {currentDateInfo && currentDateInfo.tables.length > 1 && (
              <TableSwitcher
                tables={currentDateInfo.tables}
                selectedTableId={selectedTableId}
                onTableChange={handleTableChange}
              />
            )}
          </div>

          {/* Context Info and Download Button */}
          <div className="flex items-center gap-3 flex-wrap">
            {currentDateInfo && currentTableInfo && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
                <AlertCircle className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                <span className="font-medium text-blue-900">
                  {currentDateInfo.date} - {currentTableInfo.table_name}
                </span>
                <span className="text-blue-700">
                  • {currentTableInfo.guests} guests
                  {currentAttendees.length > 0 &&
                    ` • ${currentAttendees.length} added`}
                </span>
              </div>
            )}
            {/* Download CSV Button */}
            <Button
              onClick={handleDownloadMenuChoices}
              size="sm"
              variant="outline"
              className="h-9 gap-2 border-2 hover:bg-gray-50"
              disabled={downloadingMenuChoices || !selectedDateKey}
            >
              {downloadingMenuChoices ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  Download CSV
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column - Menu Selection Form */}
        <div>
          {isLoadingMenuItems ? (
            <MenuSelectionFormSkeleton />
          ) : (
            <MenuSelectionForm
              eventName={bookingData.event_name}
              editingAttendee={editingAttendee}
              menuItems={menuItemsData?.data?.event_menu || []}
              isTableFull={isTableFull}
              onSaveAttendee={handleSaveAttendee}
              onCancelEdit={handleCancelEdit}
            />
          )}
        </div>

        {/* Right Column - Attendee List */}
        <div>
          <AttendeeList
            attendees={currentAttendees}
            totalGuests={totalGuests}
            menuItems={menuItemsData?.data?.event_menu || []}
            onEditAttendee={(id) => {
              const attendee = currentAttendees.find((a) => a.id === id);
              if (attendee) handleEditAttendee(attendee);
            }}
            onDuplicateAttendee={(id) => {
              const attendee = currentAttendees.find((a) => a.id === id);
              if (attendee) handleDuplicateAttendee(attendee);
            }}
            duplicatingId={duplicatingId}
          />
        </div>
      </div>
    </section>
  );
}

export default function MenuChoicesPage({
  params,
}: Readonly<MenuChoicesPageProps>) {
  return (
    <Suspense fallback={<MenuChoicesPageSkeleton />}>
      <MenuChoicesContent params={params} />
    </Suspense>
  );
}
