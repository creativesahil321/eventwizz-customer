export type SystemLogsTab = "all" | "warning" | "error";

/** Laravel pagination meta for system logs (from/to may be null when empty). */
export interface SystemLogsPaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
  links: Array<{
    url: string | null;
    label: string;
    page?: number | null;
    active: boolean;
  }>;
  path: string;
}

export interface AdminSystemLogsParams {
  tab?: SystemLogsTab;
  page?: number;
  per_page?: number;
}

export interface SystemLogApiRow {
  level: string;
  time: string;
  description: string;
}

export interface SystemLogsCounts {
  all: number;
  errors: number;
  warnings: number;
}

export interface AdminSystemLogsResponse {
  status: boolean;
  message: string;
  data: SystemLogApiRow[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: SystemLogsPaginationMeta;
  counts?: SystemLogsCounts;
  errors?: unknown[];
}
