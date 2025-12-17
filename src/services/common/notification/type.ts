export interface Notification {
  id: number;
  icon: string;
  title: string;
  notice: string;
  action_url: string;
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
  category?: string;
  status?: "read" | "unread" | string;
  page?: number;
  limit?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  categories: {
    [key: string]: number;
  };
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
