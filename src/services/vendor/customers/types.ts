import { ApiResponse } from "@/services/core/api-client";

/**
 * Customer interface representing a customer record from API
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
}

/**
 * Customer query parameters
 */
export interface CustomersQueryParams {
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

/**
 * API Response types
 */
export interface CustomersResponse extends ApiResponse {
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
}

export interface CustomerResponse extends ApiResponse {
  data: Customer;
}

export interface CustomerCreateResponse extends ApiResponse {
  data: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    status: "active" | "inactive";
    created_at: string;
  };
  errors: string[];
}

export interface CustomerUpdateResponse extends ApiResponse {
  data: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    status: "active" | "inactive";
    created_at: string;
  };
  errors: string[];
}

export interface CustomerDeleteResponse extends ApiResponse {
  data: null;
}
