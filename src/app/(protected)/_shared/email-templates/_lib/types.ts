import { Row } from "@tanstack/react-table";

export type EmailTemplate = {
  updated_at: unknown;
  body: unknown;
  email: unknown;
  subject: unknown;
  created_at: EmailTemplate;
  id: number;
  title: string;
  who_received: string;
  when_received: string;
  status: string;
};

export type SearchParams = {
  page?: string | number;
  per_page?: string | number;
  search?: string;
  options?: Record<string, unknown>;
};

export interface DataTableRowAction<TData> {
  row: Row<TData>;
  type: "update" | "show";
}

export interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
  errors?: string[];
  meta?: {
    current_page: number;
    from: number;
    last_page: number;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
  links?: {
    first: string;
    last: string;
    next: string | null;
    prev: string | null;
  };
}
