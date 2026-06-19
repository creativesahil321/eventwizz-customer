import type { DateOption, RoomOption, TableAssignmentRow } from "./types";

/** Placeholder rooms until table-assignment API returns real rooms. */
export const DUMMY_ROOM_OPTIONS: RoomOption[] = [
  { key: "dummy-room-main-hall", label: "Main Hall" },
  { key: "dummy-room-terrace", label: "Terrace" },
  { key: "dummy-room-ballroom", label: "Ballroom" },
];

/** Placeholder dates when the event has no dated table config in the API yet. */
export const DUMMY_DATE_OPTIONS: DateOption[] = [
  { key: "dummy-date-1", label: "Sat, Jun 15, 2026", raw: "2026-06-15" },
  { key: "dummy-date-2", label: "Sun, Jun 22, 2026", raw: "2026-06-22" },
  { key: "dummy-date-3", label: "Tue, Jul 1, 2026", raw: "2026-07-01" },
];

export const DUMMY_ROWS: TableAssignmentRow[] = [
  {
    id: "1",
    name: "Ankit Sharma",
    segment: "Premium member",
    booked: 4,
    tempTables: ["A1", "A2", "A3", "A4"],
    finalTables: ["1", "2", "3", "4"],
    status: "assigned",
    isConfirmed: true,
  },
  {
    id: "2",
    name: "Shubham Patel",
    segment: "Corporate delegate",
    booked: 3,
    tempTables: ["E1", "E2", "E3"],
    finalTables: ["5", "6", "7"],
    status: "assigned",
    isConfirmed: true,
  },
  {
    id: "3",
    name: "Julian Moretti",
    segment: "Standard pass",
    booked: 2,
    tempTables: ["D2", "D3"],
    finalTables: ["45", "46"],
    status: "assigned",
    isConfirmed: true,
  },
  {
    id: "4",
    name: "Elena Rodriguez",
    segment: "Staff",
    booked: 1,
    tempTables: ["B1"],
    finalTables: [],
    status: "pending",
    pendingHint: "Pending (0/1)",
    isConfirmed: false,
  },
  {
    id: "5",
    name: "Marcus Aurelius",
    segment: "Stock holdings",
    booked: 2,
    tempTables: ["D5", "D6"],
    finalTables: ["10", "11"],
    status: "assigned",
    isConfirmed: true,
  },
];
