export interface Notification {
  id: number;
  icon: string;
  icon_name?: string | null;
  icon_color?: string | null;
  title: string;
  notice: string;
  action_url: string | null;
  action_label?: string | null;
  action_target?: "same_tab" | "new_tab" | null;
  category?: string | null;
  severity?: "info" | "success" | "warning" | "danger" | null;
  is_read: number; // 0 = unread, 1 = read
  created_at: string;
  user: {
    id: number;
    full_name: string;
    avatar?: string;
    // Other user fields might be available but we don't need them in the UI
  };
}

export interface NotificationFilters {
  /** API feed filter: unread | bookings | payments | customers | vendors | system */
  filter?:
    | "unread"
    | "bookings"
    | "payments"
    | "customers"
    | "vendors"
    | "system"
    | string;
  /** Server-side search query */
  search?: string;
  page?: number;
  limit?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
}

export interface NotificationResponse {
  status: boolean;
  message: string;
  data: {
    data: Notification[];
    links: {
      first: string;
      last: string;
      prev: string | null;
      next: string | null;
    };
    meta: {
      current_page: number;
      from: number;
      last_page: number;
      links: Array<{
        url: string | null;
        label: string;
        active: boolean;
      }>;
      path: string;
      per_page: number;
      to: number;
      total: number;
    };
  };
  errors: string[];
}

export type UserRole = "admin" | "vendor" | "customer";
