export type AssignmentStatus = "assigned" | "pending";

export type TableAssignmentRow = {
  id: string;
  bookingDateId?: number;
  bookingId?: number;
  name: string;
  segment?: string;
  booked: number;
  tempTables: string[];
  /** Per temp slot: API `seats` when present; else split from `booked` across slots. */
  tempTableSeatCounts?: number[];
  finalTables: string[];
  /** Per final slot: API `seats` when present; else derived from temp slots / `booked`. */
  finalTableSeatCounts?: number[];
  /** API slot ids -> temp label (when list payload uses keyed maps). */
  tempTablesBySlotKey?: Record<string, string>;
  /** API slot ids -> final table number — POST uses `final_tables[slotId]=value`; DELETE body uses slot id. */
  finalTablesBySlotKey?: Record<string, string>;
  status: AssignmentStatus;
  /** User-confirmed (saved) selection for this row. Resets on any edit. */
  isConfirmed?: boolean;
  pendingHint?: string;
};

export type RoomOption = { key: string; label: string };

export type DateOption = { key: string; label: string; raw: string };
