import { Row } from "@tanstack/react-table";

/**
 * Customer interface representing a customer record
 */
export interface Customer {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: "active" | "inactive";
  created_at: string;
  deleted_at?: string | null;
}

/**
 * API response for customers
 */
export interface CustomerResponse {
  status: boolean;
  message: string;
  data: Customer[];
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
    per_page: number;
    to: number;
    total: number;
    links: Array<{
      url: string | null;
      label: string;
      page: number | null;
      active: boolean;
    }>;
    path: string;
  };
  errors: string[];
}

/**
 * Data table row action type
 */
export type DataTableRowAction<TData> = {
  row: Row<TData>;
  type:
    | "show"
    | "delete"
    | "edit"
    | "mail"
    | "login-as"
    | "restore"
    | "permanent-delete";
};

/**
 * Customer query parameters
 */
export interface SearchParams {
  page?: number | string;
  per_page?: number | string;
  search?: string;
  status?: string;
}

/**
 * Customer create payload
 */
export interface CustomerCreatePayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirmation: string;
  status?: "active" | "inactive";
}

/**
 * Customer update payload
 */
export interface CustomerUpdatePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  password_confirmation?: string;
  status?: "active" | "inactive";
}
