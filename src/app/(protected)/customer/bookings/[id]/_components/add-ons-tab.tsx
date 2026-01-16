"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { UtensilsCrossed, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Import sub-components
import { DateSelector } from "./add-ons/date-selector";
import { PeopleCountSelector } from "./add-ons/people-count-selector";
import { ExistingTablesSection } from "./add-ons/existing-tables-section";
import { NewTablesSection } from "./add-ons/new-tables-section";
import { DrinksSection } from "./add-ons/drinks-section";
import { TicketsSection } from "./add-ons/tickets-section";
import GuestAllocationModal from "./guest-allocation-modal";

// Import hooks
import { useAddOnsDetails } from "@/services/customer/bookings/hooks/useAddOnsDetails";
import { useSaveAddOns } from "@/services/customer/bookings/hooks/useSaveAddOns";
import { toast } from "sonner";

// Import types
import type {
  BookingDate,
  DrinkItem,
  TicketItem,
  AvailableTableSize,
  NewTableState,
  TableData,
} from "./add-ons/types";

interface AddOnsTabProps {
  bookingId: string;
  totalPeople?: number;
  totalTables?: number;
  dates?: BookingDate[];
  onSaveSuccess?: () => void;
}

export default function AddOnsTab({
  bookingId,
  dates = [],
  onSaveSuccess,
}: AddOnsTabProps) {
  const [selectedDate, setSelectedDate] = useState<string>(dates[0]?.id || "");

  // Fetch add-ons data from API
  const {
    data: addOnsData,
    isLoading,
    error,
  } = useAddOnsDetails(bookingId, selectedDate);

  // Save add-ons mutation
  const saveAddOnsMutation = useSaveAddOns();

  // People count state
  const [additionalPeopleCount, setAdditionalPeopleCount] = useState<number>(0);
  const [inputValue, setInputValue] = useState<string>("0");
  const previousPeopleCountRef = useRef<number | undefined>(undefined);

  // Table states
  const [tablePeopleAdditions, setTablePeopleAdditions] = useState<
    Record<string, number>
  >({});
  const [existingTableAllocations, setExistingTableAllocations] = useState<
    Record<string, number[]>
  >({});
  const [newTables, setNewTables] = useState<Record<string, NewTableState>>({});
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showExistingAllocationModal, setShowExistingAllocationModal] =
    useState(false);
  const [selectedExistingTableId, setSelectedExistingTableId] = useState<
    string | null
  >(null);

  // Transform API data to component format
  const [drinks, setDrinks] = useState<DrinkItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [availableTableSizes, setAvailableTableSizes] = useState<
    AvailableTableSize[]
  >([]);
  const [existingTables, setExistingTables] = useState<TableData[]>([]);

  /**
   * Transform API data to component format when data changes
   * Ensures data integrity and security by validating and transforming API responses
   */
  useEffect(() => {
    if (addOnsData?.data) {
      // Transform drinks - ensures price is a valid number
      const transformedDrinks: DrinkItem[] = addOnsData.data.drinks
        .filter((drink) => drink.status === 1) // Only active drinks
        .map((drink) => ({
          id: drink.id,
          title: drink.title,
          description: drink.description,
          price: parseFloat(drink.price) || 0,
          quantity: 0,
          maxQuantity: Math.max(0, drink.available_drinks), // Use available_drinks from API
        }));
      setDrinks(transformedDrinks);

      // Transform tickets - calculates available capacity securely
      const transformedTickets: TicketItem[] = addOnsData.data.tickets.map(
        (ticket) => ({
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          price: Math.max(0, ticket.price), // Ensure non-negative
          quantity: 0,
          maxQuantity: Math.max(0, ticket.available_tickets), // Use available_tickets from API
        })
      );
      setTickets(transformedTickets);

      // Transform available tables - validates table data
      const transformedTables: AvailableTableSize[] =
        addOnsData.data.tables.map((table) => ({
          id: table.id,
          size: table.max_persons,
          min_persons: Math.max(1, table.min_persons), // At least 1 person
          max_persons: Math.max(table.min_persons, table.max_persons),
          price: Math.max(0, table.price), // Ensure non-negative
          available: Math.max(0, table.available_tables), // Use available_tables from API
        }));
      setAvailableTableSizes(transformedTables);

      // Transform existing tables with allocation - validates allocation data
      const selectedTables = Array.isArray(addOnsData.data.selected_tables)
        ? addOnsData.data.selected_tables
        : [];
      const transformedExistingTables: TableData[] = selectedTables.map(
        (selectedTable, index) => {
          // Handle two allocation formats:
          // 1. Array of objects (for add-ons): [{parent_id: 110, seats: 20}]
          // 2. Record/object (for main booking): {"127": 8, "128": 8} or {"127": "+4", "128": "+4"}
          const allocationData = selectedTable.allocation || [];

          // Extract seats and parent_ids
          const seats: number[] = [];
          const parentIds: number[] = [];

          // Check if allocation is an array of objects (add-ons format)
          if (Array.isArray(allocationData)) {
            allocationData.forEach((item) => {
              if (
                item &&
                typeof item === "object" &&
                "parent_id" in item &&
                "seats" in item
              ) {
                // Format: {parent_id: 110, seats: 20}
                const allocationItem = item as {
                  parent_id: number;
                  seats: number;
                };
                parentIds.push(Number(allocationItem.parent_id));
                seats.push(Math.max(0, Number(allocationItem.seats)));
              }
            });
          } else if (
            typeof allocationData === "object" &&
            allocationData !== null
          ) {
            // Format: Record<string, number | string> - {"127": 8, "128": 8}
            Object.entries(allocationData).forEach(([tableId, value]) => {
              parentIds.push(parseInt(tableId));
              // Parse numeric value from either number or string ("+4" -> 4)
              const numericValue =
                typeof value === "string"
                  ? parseInt(value.replace("+", ""))
                  : value;
              seats.push(Math.max(0, numericValue));
            });
          }

          // Ensure allocation and parent_ids arrays match table_count
          // If API returns fewer entries, pad with zeros/defaults
          const tableCount = selectedTable.no_tables || 1;
          while (seats.length < tableCount) {
            seats.push(0);
            // For missing parent_ids, use sequential IDs starting from the last known ID + 1
            const lastParentId =
              parentIds.length > 0 ? Math.max(...parentIds) : 0;
            parentIds.push(lastParentId + parentIds.length + 1);
          }
          // If we have more entries than table_count, trim to match
          if (seats.length > tableCount) {
            seats.splice(tableCount);
            parentIds.splice(tableCount);
          }

          return {
            id: `table-${selectedTable.table_size}-${index}`,
            tableConfigId: Number(selectedTable.id), // Store actual table configuration ID from backend
            capacity: selectedTable.table_size,
            table_count: tableCount,
            allocation: seats, // Array of seat counts [8, 8]
            parent_ids: parentIds, // Array of parent IDs [127, 128]
            people_added: seats.reduce((sum, count) => sum + count, 0), // Sum of all seats
            // Parse price as number from string format "40.00"
            price_per_person: parseFloat(selectedTable.price) || 0,
          };
        }
      );
      setExistingTables(transformedExistingTables);
    }
  }, [addOnsData]);

  // Reset all allocations when people count changes
  useEffect(() => {
    const previousCount = previousPeopleCountRef.current;

    // Skip reset on initial mount (when ref hasn't been set yet)
    if (previousCount === undefined) {
      previousPeopleCountRef.current = additionalPeopleCount;
      return;
    }

    // Only reset if the count actually changed
    if (previousCount !== additionalPeopleCount) {
      // Reset all table-related state when people count changes
      setTablePeopleAdditions({});
      setExistingTableAllocations({});
      setNewTables({});
      setShowAllocationModal(false);
      setShowExistingAllocationModal(false);
      setSelectedExistingTableId(null);

      // Update ref for next comparison
      previousPeopleCountRef.current = additionalPeopleCount;
    }
  }, [additionalPeopleCount]);

  // People count handlers
  const handlePeopleCountChange = (delta: number) => {
    const newCount = Math.max(0, Math.min(additionalPeopleCount + delta, 100));
    setAdditionalPeopleCount(newCount);
    setInputValue(String(newCount));
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const handleInputBlur = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue === "") {
      setAdditionalPeopleCount(0);
      setInputValue("0");
      return;
    }

    const num = parseInt(trimmedValue);
    if (isNaN(num) || num < 0) {
      setInputValue(String(additionalPeopleCount));
      return;
    }

    const validatedNum = Math.min(Math.max(0, num), 100);
    setAdditionalPeopleCount(validatedNum);
    setInputValue(String(validatedNum));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  // Table helper functions
  const getAvailableSeats = (table: TableData): number => {
    const totalCapacity = table.capacity * table.table_count;
    const usedCapacity = table.allocation.reduce(
      (sum, people) => sum + people,
      0
    );
    return totalCapacity - usedCapacity;
  };

  const totalAvailableSeats = existingTables.reduce(
    (sum, table) => sum + getAvailableSeats(table),
    0
  );

  const handleAddPeopleToTable = (tableId: string, delta: number) => {
    setTablePeopleAdditions((prev) => {
      const currentCount = prev[tableId] || 0;
      const newCount = currentCount + delta;

      // Prevent going below 0
      if (newCount < 0) {
        return prev;
      }

      // Find the table to check its capacity constraints
      const table = existingTables.find((t) => t.id === tableId);
      if (!table) {
        return prev;
      }

      // Calculate per-table capacity limit
      // Each table can only hold up to its capacity
      // Current allocation per table (e.g., [10, 10, 10, 10])
      const currentAllocation = table.allocation || [];
      const maxPerTable = table.capacity;

      // Calculate how many people we can add to this table type
      // We need to ensure no individual table exceeds capacity
      // When adding people, they'll be distributed proportionally
      // So we need to check: can we add X people without any table exceeding capacity?
      let maxCanAdd = 0;
      if (currentAllocation.length === table.table_count) {
        // Calculate max we can add: sum of (capacity - current) for each table
        maxCanAdd = currentAllocation.reduce((sum, current) => {
          return sum + Math.max(0, maxPerTable - current);
        }, 0);
      } else {
        // If allocation doesn't match, use total available seats
        maxCanAdd = getAvailableSeats(table);
      }

      // Prevent exceeding per-table capacity limits
      if (newCount > maxCanAdd) {
        return prev;
      }

      // Calculate total people already added to all existing tables
      const totalPeopleInExisting = Object.values(prev).reduce(
        (sum, count) => sum + count,
        0
      );

      // Calculate what the new total would be if we update this table
      const newTotal = totalPeopleInExisting - currentCount + newCount;

      // Prevent exceeding additionalPeopleCount
      if (newTotal > additionalPeopleCount) {
        return prev;
      }

      // Remove from object if count is 0
      if (newCount === 0) {
        const updated = { ...prev };
        delete updated[tableId];
        return updated;
      }

      return {
        ...prev,
        [tableId]: newCount,
      };
    });
  };

  const handleAddNewTable = (tableSizeId: number, delta: number) => {
    const sizeKey = `size-${tableSizeId}`;
    setNewTables((prev) => {
      const current = prev[sizeKey] || { quantity: 0, allocation: [] };
      const newQuantity = Math.max(0, current.quantity + delta);
      if (newQuantity === 0) {
        const updated = { ...prev };
        delete updated[sizeKey];
        return updated;
      }
      return {
        ...prev,
        [sizeKey]: {
          quantity: newQuantity,
          allocation: newQuantity > 0 ? Array(newQuantity).fill(0) : [],
        },
      };
    });
  };

  // Drinks handlers
  const handleDrinkQuantityChange = (drinkId: number, delta: number) => {
    setDrinks((prevDrinks) =>
      prevDrinks.map((drink) =>
        drink.id === drinkId
          ? {
              ...drink,
              quantity: Math.max(
                0,
                Math.min(drink.quantity + delta, drink.maxQuantity || Infinity)
              ),
            }
          : drink
      )
    );
  };

  const handleDrinkRemove = (drinkId: number) => {
    setDrinks((prevDrinks) =>
      prevDrinks.map((drink) =>
        drink.id === drinkId ? { ...drink, quantity: 0 } : drink
      )
    );
  };

  // Tickets handlers
  const handleTicketQuantityChange = (ticketId: number, delta: number) => {
    setTickets((prevTickets) =>
      prevTickets.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              quantity: Math.max(
                0,
                Math.min(
                  ticket.quantity + delta,
                  ticket.maxQuantity || Infinity
                )
              ),
            }
          : ticket
      )
    );
  };

  const handleTicketRemove = (ticketId: number) => {
    setTickets((prevTickets) =>
      prevTickets.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, quantity: 0 } : ticket
      )
    );
  };

  // Calculate people for new tables
  const totalPeopleInExisting = Object.values(tablePeopleAdditions).reduce(
    (sum, count) => sum + count,
    0
  );
  const remainingPeople = additionalPeopleCount - totalPeopleInExisting;

  // Check if existing tables need allocation (multiple tables of same type with people added)
  const existingTablesNeedingAllocation = existingTables.filter(
    (table) => tablePeopleAdditions[table.id] > 0 && table.table_count > 1
  );

  // Format existing tables for allocation modal
  const existingTablesForAllocation = existingTablesNeedingAllocation.map(
    (table, index) => {
      const peopleToAdd = tablePeopleAdditions[table.id] || 0;
      const availableSeats = getAvailableSeats(table);

      return {
        id: table.id, // Keep string ID for mapping
        numericId: table.tableConfigId || index + 1000, // Use backend ID or unique numeric ID
        title: `Table for ${table.capacity}`,
        size: table.capacity,
        min_persons: 1, // Minimum 1 person per table
        max_persons: table.capacity, // Max is table capacity
        quantity: table.table_count,
        price: 0, // Existing tables don't have additional cost
        currentAllocation: table.allocation || [],
        availableSeats: availableSeats,
        peopleToAdd: peopleToAdd,
      };
    }
  );

  // Always show new tables when user adds people (they might want separate tables)
  const shouldShowNewTables = additionalPeopleCount > 0;

  // Calculate how many people need new tables
  // Show remaining people after existing table allocations
  // If all guests are allocated to existing tables, peopleForNewTables = 0 (hide new tables section)
  const peopleForNewTables = Math.max(0, remainingPeople);

  // Check if multiple new tables are selected (need allocation)
  const totalNewTablesCount = Object.values(newTables).reduce(
    (sum, table) => sum + table.quantity,
    0
  );
  const needsAllocation = totalNewTablesCount > 1;

  // Format new tables for allocation modal
  const selectedTablesForAllocation = Object.entries(newTables)
    .filter(([, table]) => table.quantity > 0)
    .map(([key, table]) => {
      const tableSizeId = parseInt(key.replace("size-", ""));
      const tableSize = availableTableSizes.find((t) => t.id === tableSizeId);
      return {
        id: tableSizeId,
        title: `Table for ${tableSize?.size || 0}`,
        size: tableSize?.size || 0,
        min_persons: tableSize?.min_persons || 1,
        max_persons: tableSize?.max_persons || 999,
        quantity: table.quantity,
        price: tableSize?.price || 0,
      };
    });

  // Track if user has made any selections/changes to enable Save button
  const hasSelectedDrinks = drinks.some((drink) => drink.quantity > 0);
  const hasSelectedTickets = tickets.some((ticket) => ticket.quantity > 0);
  const hasExistingTableUpdates =
    Object.values(tablePeopleAdditions).some((count) => count > 0) ||
    Object.values(existingTableAllocations).some(
      (allocation) =>
        Array.isArray(allocation) && allocation.some((value) => value > 0)
    );
  const hasNewTableSelections = Object.values(newTables).some(
    (table) => table.quantity > 0
  );
  const hasChanges =
    hasSelectedDrinks ||
    hasSelectedTickets ||
    hasExistingTableUpdates ||
    hasNewTableSelections;

  // Comprehensive validation function
  const validateAddOns = () => {
    const errors: string[] = [];

    // If no changes, validation passes (but save button will be disabled)
    if (!hasChanges) {
      return { isValid: true, errors: [] };
    }

    // Validate existing tables: only require allocation if people were added AND table has multiple sub-tables
    for (const table of existingTables) {
      const peopleAdded = tablePeopleAdditions[table.id] || 0;

      // Skip if no people were added to this table
      if (peopleAdded === 0) continue;

      // Single table doesn't need explicit allocation
      if (table.table_count === 1) continue;

      // Multiple tables require allocation via "Manage" modal
      const allocation = existingTableAllocations[table.id];

      if (!allocation || allocation.length === 0) {
        errors.push(
          `Table for ${table.capacity} (${
            table.table_count
          } tables): Please use "Manage" button to allocate ${peopleAdded} additional guest${
            peopleAdded > 1 ? "s" : ""
          }`
        );
        continue;
      }

      // Validate allocation completeness
      if (allocation.length !== table.table_count) {
        errors.push(
          `Table for ${table.capacity}: Allocation required for all ${table.table_count} tables`
        );
        continue;
      }

      // Validate each sub-table allocation
      const originalAllocation = table.allocation || [];
      for (let i = 0; i < allocation.length; i++) {
        const guestCount = allocation[i];
        const minAllowed = originalAllocation[i] || 1;

        if (guestCount < minAllowed) {
          errors.push(
            `Table for ${table.capacity} - Table ${
              i + 1
            }: Cannot reduce below ${minAllowed} guests`
          );
        }

        if (guestCount > table.capacity) {
          errors.push(
            `Table for ${table.capacity} - Table ${i + 1}: Maximum ${
              table.capacity
            } guests allowed`
          );
        }
      }
    }

    // Validate new tables AND total guest allocation
    const totalNewTablesCount = Object.values(newTables).reduce(
      (sum, table) => sum + table.quantity,
      0
    );

    // Calculate total people allocated to existing tables
    let totalExistingAllocated = 0;
    for (const table of existingTables) {
      const peopleAdded = tablePeopleAdditions[table.id] || 0;
      totalExistingAllocated += peopleAdded;
    }

    // Calculate how many people still need tables (not allocated to existing)
    const peopleNeedingNewTables =
      additionalPeopleCount - totalExistingAllocated;

    // Calculate total capacity of selected new tables
    let totalNewTableCapacity = 0;

    if (totalNewTablesCount > 0) {
      for (const [key, table] of Object.entries(newTables)) {
        if (table.quantity === 0) continue;

        const tableSizeId = Number.parseInt(key.replace("size-", ""));
        const tableSize = availableTableSizes.find((t) => t.id === tableSizeId);

        if (!tableSize) continue;

        // Require allocation if multiple tables of same type selected
        if (table.quantity > 1) {
          if (!table.allocation || table.allocation.length !== table.quantity) {
            errors.push(
              `Table for ${
                tableSize.size || 0
              }: Please use "Manage" button to allocate guests across ${
                table.quantity
              } table${table.quantity > 1 ? "s" : ""}`
            );
            continue;
          }

          // Validate each table allocation
          for (let i = 0; i < table.allocation.length; i++) {
            const guestCount = table.allocation[i];
            const minPersons = tableSize.min_persons || 1;
            const maxPersons = tableSize.max_persons || 999;

            if (guestCount < minPersons) {
              errors.push(
                `Table for ${tableSize.size || 0} - Table ${
                  i + 1
                }: Minimum ${minPersons} guest${
                  minPersons > 1 ? "s" : ""
                } required`
              );
            }

            if (guestCount > maxPersons) {
              errors.push(
                `Table for ${tableSize.size || 0} - Table ${
                  i + 1
                }: Maximum ${maxPersons} guests allowed`
              );
            }

            totalNewTableCapacity += guestCount;
          }
        } else {
          // Single table - add its max capacity
          totalNewTableCapacity += tableSize.max_persons * table.quantity;
        }
      }
    }

    // CRITICAL: Check if selected tables can accommodate all remaining people
    if (errors.length === 0 && peopleNeedingNewTables > 0) {
      if (totalNewTableCapacity < peopleNeedingNewTables) {
        errors.push(
          `Selected tables can accommodate ${totalNewTableCapacity} guests, but you need seating for ${peopleNeedingNewTables} guests. Please select more tables.`
        );
      }
    }

    // Also verify that all people are actually allocated
    if (
      errors.length === 0 &&
      totalExistingAllocated < additionalPeopleCount &&
      totalNewTablesCount === 0
    ) {
      errors.push(
        `You have ${additionalPeopleCount} guests but only allocated ${totalExistingAllocated}. Please select additional tables.`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // Validate allocation (for backward compatibility)
  const isAllocationValid = () => {
    if (!needsAllocation) return true;

    // Check if all tables have proper allocation
    for (const [key, table] of Object.entries(newTables)) {
      if (table.quantity > 0) {
        const tableSizeId = parseInt(key.replace("size-", ""));
        const tableSize = availableTableSizes.find((t) => t.id === tableSizeId);

        if (
          !table.allocation ||
          table.allocation.length !== table.quantity ||
          table.allocation.some(
            (count) =>
              count < (tableSize?.min_persons || 1) ||
              count > (tableSize?.max_persons || 999)
          )
        ) {
          return false;
        }
      }
    }

    // Check if total allocated matches people count
    const totalAllocated = Object.values(newTables).reduce(
      (sum, table) => sum + (table.allocation?.reduce((s, c) => s + c, 0) || 0),
      0
    );

    return totalAllocated === peopleForNewTables;
  };

  const allocationValid = isAllocationValid();

  // Calculate validation (after hasChanges is defined)
  const validation = validateAddOns();

  const isSaveDisabled =
    saveAddOnsMutation.isPending || !hasChanges || !validation.isValid;

  // Handle allocation confirmation from modal (for new tables)
  const handleAllocationConfirm = (allocations: Record<number, number[]>) => {
    setNewTables((prev) => {
      const updated = { ...prev };
      Object.entries(allocations).forEach(([tableId, allocation]) => {
        const sizeKey = `size-${tableId}`;
        if (updated[sizeKey]) {
          updated[sizeKey] = {
            ...updated[sizeKey],
            allocation,
          };
        }
      });
      return updated;
    });
    setShowAllocationModal(false);
  };

  // Handle allocation confirmation for existing tables
  const handleExistingAllocationConfirm = (
    allocations: Record<string, number[]>
  ) => {
    setExistingTableAllocations((prev) => ({
      ...prev,
      ...allocations,
    }));
    setShowExistingAllocationModal(false);
    setSelectedExistingTableId(null);
  };

  if (dates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No dates available</p>
      </div>
    );
  }

  // Handle save changes
  const handleSaveChanges = () => {
    // Validate before saving (similar to checkout)
    const validationResult = validateAddOns();
    if (!validationResult.isValid) {
      toast.error(
        validationResult.errors[0] ||
          "Please complete guest allocation for your tables"
      );
      return;
    }

    // Find the selected date
    const dateObj = dates.find((d) => d.id === selectedDate);
    if (!dateObj) {
      return;
    }

    // Prepare FormData payload
    const formData = new FormData();
    formData.append("booking_id", bookingId);
    formData.append("date", selectedDate); // Use date_key (e.g., "2025-09-20")
    formData.append("people_in_group", additionalPeopleCount.toString());

    // Add drinks data
    drinks
      .filter((drink) => drink.quantity > 0)
      .forEach((drink, index) => {
        if (drink.id) {
          formData.append(`drink_package[${index}][id]`, drink.id.toString());
        }
        formData.append(`drink_package[${index}][title]`, drink.title);
        formData.append(
          `drink_package[${index}][price]`,
          drink.price.toString()
        );
        formData.append(
          `drink_package[${index}][quantity]`,
          drink.quantity.toString()
        );
      });

    // Add tickets data (include ID like in checkout)
    tickets
      .filter((ticket) => ticket.quantity > 0)
      .forEach((ticket, index) => {
        // Add ticket ID (required for backend to identify the ticket)
        formData.append(`tickets[${index}][id]`, ticket.id.toString());
        formData.append(`tickets[${index}][title]`, ticket.title);
        formData.append(
          `tickets[${index}][description]`,
          ticket.description || ""
        );
        formData.append(
          `tickets[${index}][price_per_ticket]`,
          ticket.price.toString()
        );
        formData.append(
          `tickets[${index}][quantity]`,
          ticket.quantity.toString()
        );
      });

    // Add tables data - combine existing tables with new tables
    let tableIndex = 0;

    // Calculate total NEW people user is adding to existing tables (not original allocation)
    let totalAllocatedToExisting = 0;
    existingTables.forEach((table) => {
      const hasUpdatedAllocation =
        Array.isArray(existingTableAllocations[table.id]) &&
        existingTableAllocations[table.id].length > 0;

      if (hasUpdatedAllocation) {
        // User used "Manage" to set new allocation
        const newAllocation = existingTableAllocations[table.id].reduce(
          (sum, count) => sum + count,
          0
        );
        const originalAllocation = table.allocation
          ? table.allocation.reduce((sum, count) => sum + count, 0)
          : 0;
        // Only count the NEW people being added (difference)
        const peopleAdded = Math.max(0, newAllocation - originalAllocation);
        totalAllocatedToExisting += peopleAdded;
      } else {
        // Count people added through simple +/- buttons
        const peopleAdded = tablePeopleAdditions[table.id] || 0;
        totalAllocatedToExisting += peopleAdded;
      }
    });

    // Calculate remaining people for new tables
    const remainingPeople = additionalPeopleCount - totalAllocatedToExisting;

    // Add existing tables with updated allocations
    existingTables.forEach((table) => {
      const peopleAdded = tablePeopleAdditions[table.id] || 0;
      const hasUpdatedAllocation =
        Array.isArray(existingTableAllocations[table.id]) &&
        existingTableAllocations[table.id].length > 0;

      if (peopleAdded > 0 || hasUpdatedAllocation) {
        // Find matching table size to get min_persons
        // Add table configuration ID (from backend, required for API)
        formData.append(
          `tables[${tableIndex}][id]`,
          table.tableConfigId.toString()
        );

        formData.append(
          `tables[${tableIndex}][table_size]`,
          table.capacity.toString()
        );
        // Use table price directly (same format as backend sends it)
        formData.append(
          `tables[${tableIndex}][price_per_person]`,
          table.price_per_person.toString()
        );
        formData.append(`tables[${tableIndex}][type]`, "existing");
        formData.append(
          `tables[${tableIndex}][no_tables]`,
          table.table_count.toString()
        );

        // Calculate allocation for existing tables (ONLY additional people, not total)
        let allocation: number[];
        const originalAllocation = table.allocation || [];
        const parentIds = table.parent_ids || [];

        if (hasUpdatedAllocation) {
          // User used "Manage" button - calculate the DIFFERENCE between new and original
          const newAllocation = existingTableAllocations[table.id];
          allocation = newAllocation.map((newCount, idx) => {
            const originalCount = originalAllocation[idx] || 0;
            return Math.max(0, newCount - originalCount); // Only the additional people
          });
        } else if (peopleAdded > 0) {
          // User used +/- buttons - distribute ONLY the additional people
          // Distribute evenly across all tables
          const baseIncrease = Math.floor(peopleAdded / table.table_count);
          const remainder = peopleAdded % table.table_count;

          allocation = Array(table.table_count)
            .fill(baseIncrease)
            .map((count, idx) => count + (idx < remainder ? 1 : 0));
        } else {
          // No changes - send empty or zero allocation
          allocation = Array(table.table_count).fill(0);
        }

        // Send allocation in new format: tables[0][allocation][0][parent_id] and tables[0][allocation][0][seats]
        allocation.forEach((seats, allocationIndex) => {
          const parentId = parentIds[allocationIndex] || allocationIndex + 1;
          formData.append(
            `tables[${tableIndex}][allocation][${allocationIndex}][parent_id]`,
            parentId.toString()
          );
          formData.append(
            `tables[${tableIndex}][allocation][${allocationIndex}][seats]`,
            seats.toString()
          );
        });

        tableIndex++;
      }
    });

    // Calculate total number of new tables for allocation
    const totalNewTablesCount = Object.values(newTables).reduce(
      (sum, table) => sum + table.quantity,
      0
    );

    // Add new tables
    Object.entries(newTables).forEach(([tableKey, table]) => {
      if (table.quantity > 0) {
        // Extract table ID from key (e.g., "12" from "size-12")
        const tableId = parseInt(tableKey.replace("size-", ""));
        const tableSize = availableTableSizes.find((t) => t.id === tableId);

        if (tableSize) {
          // Add table ID (required for backend to identify the table configuration)
          formData.append(`tables[${tableIndex}][id]`, tableSize.id.toString());
          formData.append(
            `tables[${tableIndex}][table_size]`,
            tableSize.max_persons.toString()
          );
          // Use the table price directly (same format as backend: 40, 30, 20)
          formData.append(
            `tables[${tableIndex}][price_per_person]`,
            tableSize.price.toString()
          );
          formData.append(`tables[${tableIndex}][type]`, "new");
          formData.append(
            `tables[${tableIndex}][no_tables]`,
            table.quantity.toString()
          );

          // Calculate allocation for new tables
          let allocation: number[];
          if (table.allocation && table.allocation.some((a) => a > 0)) {
            // Use existing allocation if set by user (from allocation modal)
            allocation = table.allocation;
          } else if (totalNewTablesCount > 0 && remainingPeople > 0) {
            // Distribute remaining people evenly across all new tables
            const peoplePerTable = Math.floor(
              remainingPeople / totalNewTablesCount
            );
            const remainder = remainingPeople % totalNewTablesCount;
            // Create allocation array for this table's quantity
            allocation = Array(table.quantity)
              .fill(peoplePerTable)
              .map((count, idx) => (idx === 0 ? count + remainder : count));
          } else {
            // Default to min_persons if no people to allocate
            allocation = Array(table.quantity).fill(tableSize.min_persons || 1);
          }

          // Send allocation in new format: tables[i][allocation][j][parent_id] and tables[i][allocation][j][seats]
          // For new tables, use sequential parent_ids starting from 1
          allocation.forEach((seats, allocationIndex) => {
            formData.append(
              `tables[${tableIndex}][allocation][${allocationIndex}][parent_id]`,
              (allocationIndex + 1).toString()
            );
            formData.append(
              `tables[${tableIndex}][allocation][${allocationIndex}][seats]`,
              seats.toString()
            );
          });

          tableIndex++;
        }
      }
    });

    // Call mutation with FormData
    saveAddOnsMutation.mutate(formData, {
      onSuccess: () => {
        if (onSaveSuccess) {
          onSaveSuccess();
        }
      },
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Date Selector Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full" />
        </div>

        {/* Accordion Skeleton */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>

          {/* People Count Selector Skeleton */}
          <Skeleton className="h-14 w-full mb-4" />

          {/* Tables Skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>

        {/* Drinks Section Skeleton */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>

        {/* Tickets Section Skeleton */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>

        {/* Save Button Skeleton */}
        <div className="flex justify-end pt-4 border-t">
          <Skeleton className="h-12 w-40" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading add-ons data</p>
        <p className="text-sm text-muted-foreground mt-2">
          Please try refreshing the page
        </p>
      </div>
    );
  }

  // Check if all available add-on options are empty
  const hasNoAvailableOptions =
    availableTableSizes.length === 0 &&
    tickets.length === 0 &&
    drinks.length === 0;

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <DateSelector
        dates={dates}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      {/* Informative message when no add-on options are available and no existing tables */}
      {hasNoAvailableOptions && existingTables.length === 0 && (
        <div className="border rounded-lg p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <UtensilsCrossed className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">
                No Additional Options Available
              </h3>
              <p className="text-sm text-blue-700">
                There are currently no additional tables, tickets, or drinks
                available for this event date. If you need to make changes to
                your booking, please contact support.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tables & Seating Section - Show if tables are available or existing tables need management */}
      {(availableTableSizes.length > 0 || existingTables.length > 0) && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="tables" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="p-2 rounded-lg"
                  style={{
                    backgroundColor: "var(--color-primary-light, #f0f0f0)",
                  }}
                >
                  <UtensilsCrossed
                    className="h-5 w-5"
                    style={{ color: "var(--color-primary)" }}
                  />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold">Tables & Seating</h3>
                  <p className="text-sm text-muted-foreground">
                    Add more people or tables to your booking
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-4">
                {/* People Count Selector */}
                <PeopleCountSelector
                  count={additionalPeopleCount}
                  inputValue={inputValue}
                  onCountChange={handlePeopleCountChange}
                  onInputChange={handleInputChange}
                  onInputBlur={handleInputBlur}
                  onInputKeyDown={handleInputKeyDown}
                />

                {/* Guest Allocation Card - Show when multiple new tables selected */}
                {needsAllocation && (
                  <div
                    className={`border rounded-lg p-3 ${
                      allocationValid
                        ? "bg-green-50 border-green-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings
                          className={`h-4 w-4 ${
                            allocationValid
                              ? "text-green-600"
                              : "text-amber-600"
                          }`}
                        />
                        <div>
                          <h4
                            className={`text-sm font-medium ${
                              allocationValid
                                ? "text-green-900"
                                : "text-amber-900"
                            }`}
                          >
                            {allocationValid
                              ? "New Tables Allocated ✓"
                              : "New Tables Need Allocation"}
                          </h4>
                          <p
                            className={`text-xs ${
                              allocationValid
                                ? "text-green-700"
                                : "text-amber-700"
                            }`}
                          >
                            {allocationValid
                              ? `${peopleForNewTables} guests distributed across new tables`
                              : `Click to distribute ${peopleForNewTables} guests across new tables`}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setShowAllocationModal(true)}
                        size="sm"
                        variant="outline"
                        className={
                          allocationValid
                            ? "text-green-700 border-green-300 hover:bg-green-100"
                            : "text-amber-700 border-amber-300 hover:bg-amber-100"
                        }
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        {allocationValid ? "Adjust" : "Allocate Now"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Existing Tables Section */}
                {additionalPeopleCount > 0 && existingTables.length > 0 && (
                  <ExistingTablesSection
                    tables={existingTables}
                    additionalPeopleCount={additionalPeopleCount}
                    totalAvailableSeats={totalAvailableSeats}
                    tablePeopleAdditions={tablePeopleAdditions}
                    onAddPeopleToTable={handleAddPeopleToTable}
                    getAvailableSeats={getAvailableSeats}
                    onManageSeating={(tableId) => {
                      // Find the table and open modal for it
                      const table = existingTables.find(
                        (t) => t.id === tableId
                      );
                      if (table && table.table_count > 1) {
                        setSelectedExistingTableId(tableId);
                        setShowExistingAllocationModal(true);
                      }
                    }}
                    totalPeopleInExisting={totalPeopleInExisting}
                  />
                )}

                {/* New Tables Section - Only show if there are people needing new tables */}
                {additionalPeopleCount > 0 &&
                  shouldShowNewTables &&
                  peopleForNewTables > 0 && (
                    <NewTablesSection
                      peopleForNewTables={peopleForNewTables}
                      availableTableSizes={availableTableSizes}
                      newTables={newTables}
                      totalAvailableSeats={totalAvailableSeats}
                      allocationValid={allocationValid}
                      onAddNewTable={handleAddNewTable}
                      setNewTables={setNewTables}
                    />
                  )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Drinks Section - Only show if drinks are available */}
      {drinks.length > 0 && (
        <DrinksSection
          drinks={drinks}
          onQuantityChange={handleDrinkQuantityChange}
          onRemove={handleDrinkRemove}
        />
      )}

      {/* Tickets Section - Only show if tickets are available */}
      {tickets.length > 0 && (
        <TicketsSection
          tickets={tickets}
          onQuantityChange={handleTicketQuantityChange}
          onRemove={handleTicketRemove}
        />
      )}

      {/* Save Button */}
      <div className="flex flex-col items-end pt-4 border-t gap-2">
        {!validation.isValid && validation.errors.length > 0 && (
          <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 mb-1 text-sm">
                  Please fix the following issues:
                </h4>
                <ul className="space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-700">
                      • {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        <Button
          size="lg"
          className="px-8"
          onClick={handleSaveChanges}
          disabled={isSaveDisabled}
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
          }}
        >
          {saveAddOnsMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Guest Allocation Modal for New Tables */}
      <GuestAllocationModal
        isOpen={showAllocationModal}
        onClose={() => setShowAllocationModal(false)}
        newTables={selectedTablesForAllocation}
        totalPeople={peopleForNewTables}
        onConfirm={handleAllocationConfirm}
      />

      {/* Guest Allocation Modal for Existing Tables */}
      {existingTablesForAllocation.length > 0 && (
        <GuestAllocationModal
          isOpen={showExistingAllocationModal}
          onClose={() => {
            setShowExistingAllocationModal(false);
            setSelectedExistingTableId(null);
          }}
          newTables={
            selectedExistingTableId
              ? existingTablesForAllocation
                  .filter((t) => t.id === selectedExistingTableId)
                  .map((table) => ({
                    id: table.numericId,
                    title: table.title,
                    size: table.size,
                    min_persons: table.min_persons,
                    max_persons: table.max_persons,
                    quantity: table.quantity,
                    price: table.price,
                    currentAllocation: table.currentAllocation,
                  }))
              : existingTablesForAllocation.map((table) => ({
                  id: table.numericId,
                  title: table.title,
                  size: table.size,
                  min_persons: table.min_persons,
                  max_persons: table.max_persons,
                  quantity: table.quantity,
                  price: table.price,
                  currentAllocation: table.currentAllocation,
                }))
          }
          totalPeople={
            selectedExistingTableId
              ? existingTablesForAllocation.find(
                  (t) => t.id === selectedExistingTableId
                )?.peopleToAdd || 0
              : existingTablesForAllocation.reduce(
                  (sum, table) => sum + table.peopleToAdd,
                  0
                )
          }
          onConfirm={(allocations) => {
            // Map numeric IDs back to string IDs for existing tables
            const stringAllocations: Record<string, number[]> = {};
            Object.entries(allocations).forEach(([numericKey, allocation]) => {
              const numericId = Number(numericKey);
              const table = existingTablesForAllocation.find(
                (t) => t.numericId === numericId
              );
              if (table) {
                stringAllocations[table.id] = allocation;
              }
            });
            handleExistingAllocationConfirm(stringAllocations);
          }}
        />
      )}
    </div>
  );
}
