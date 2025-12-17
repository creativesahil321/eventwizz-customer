export type User = {
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
};

export type NotificationPayload = {
  user: User;
  category: string;
  notification: string;
  date: string;
};

export type Notification = {
  id: string;
  timestamp: string;
  role: "admin" | "customer" | "vendor" | "all";
  read: boolean;
  priority: "low" | "medium" | "high";
  payload: NotificationPayload;
};

export type DataTableRowAction<T> = {
  type: "mark-read" | "view-details";
  row: { original: T };
};

export type SearchParams = {
  page: number;
  per_page: number;
  category: string | "";
  read: "true" | "false" | "";
  sort: "timestamp.asc" | "timestamp.desc" | "priority.asc" | "priority.desc";
};

export type DataTableFilterField<T> = {
  id: keyof T | string;
  label: string;
  type?: "text" | "dropdown" | "date";
  options?: { label: string; value: string; icon?: React.ComponentType }[];
  placeholder?: string;
};
