export type TableAssignmentsQueryParams = {
  /** Event slug (API expects `event=...`) */
  event: string;
  /** YYYY-MM-DD */
  date: string;
  /** Server-side filter: guest name, table numbers, etc. (omit when empty) */
  search?: string;
  per_page?: number;
  next_cursor?: string | null;
  prev_cursor?: string | null;
};

export type TableAssignmentStatus = "Pending" | "Completed" | string;

export type TempTableSlotApi = {
  id: number | string;
  table_number: string;
  /** Seats at this temp slot (capacity or allocation — backend-defined). */
  seats?: number;
};

export type FinalTableSlotApi = {
  id: number | string;
  final_table_number: string;
  seats?: number;
};

export type TableAssignmentItem = {
  booking_date_id?: number;
  booking_id?: number;
  guest: string;
  booked: number;
  booking_number?: string;
  /** Slot id -> temp label; or legacy string[]; or slot rows from API. */
  temp_tables?:
    | string[]
    | Record<string, string>
    | TempTableSlotApi[];
  /** Slot id -> final table number; or legacy string[]; or slot rows from API. */
  final_tables?:
    | string[]
    | Record<string, string>
    | FinalTableSlotApi[];
  status: TableAssignmentStatus;
};

export type TableAssignmentsPagination = {
  per_page: number;
  next_cursor: string | null;
  prev_cursor: string | null;
  has_more: boolean;
};

export type TableAssignmentsSummary = {
  total_tables: number;
  completed_tables: number;
  awaiting_tables: number;
  seating_plan_image: string | null;
};

export type TableAssignmentsResponse = {
  status: boolean;
  message: string;
  data: TableAssignmentItem[];
  pagination: TableAssignmentsPagination;
  summary: TableAssignmentsSummary;
};

