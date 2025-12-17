export type SupportTicket = {
  id: string;
  requested_by: string;
  subject: string;
  priority: "low" | "medium" | "high";
  agent: string;
  created_at: string;
  status: "open" | "pending" | "closed";
};

export type DataTableRowAction<T> =
  | { type: "markAsSolved"; row: { original: T } }
  | { type: "assignee"; row: { original: T } }
  | { type: "archive"; row: { original: T } }
  | { type: "delete"; row: { original: T } };
