/**
 * Location row on staff index / staff show (`locations[]`).
 * Matches API: `{ "id": 1, "city": "London" }`.
 */
export interface StaffLocationApi {
  id: number;
  city: string;
}

/**
 * Staff row from **GET** `/vendor/staffs` (paginated list) and **GET** `/vendor/staffs/find/{id}`.
 * Same snake_case shape as your Laravel responses (no camelCase variants here).
 */
export interface StaffMember {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  role: string;
  role_id: number;
  locations: StaffLocationApi[];
  created_at: string;
  /** Optional if the API adds it later (list UI supports avatars). */
  avatar?: string;
  /** Optional; only when the API sends explicit vendor location ids on the row. */
  vendor_location_id?: number;
  vendor_location_ids?: number[];
}

/**
 * Response type for single staff member
 */
export interface SingleStaffResponse {
  status: boolean;
  message: string;
  data: StaffMember;
  errors?: string[];
}

/** Laravel paginator link row (meta.links) */
export interface StaffPaginatorLinkRow {
  url: string | null;
  label: string;
  page: number | null;
  active: boolean;
}

/** Laravel length-aware paginator meta (vendor/admin staffs index) */
export interface StaffListMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
  path?: string;
  links?: StaffPaginatorLinkRow[];
}

/** Top-level links object from Laravel resource collection */
export interface StaffListLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

/**
 * Response type for staff list
 */
export interface StaffResponse {
  status: boolean;
  message: string;
  data: StaffMember[];
  meta?: StaffListMeta;
  links?: StaffListLinks;
  errors?: string[];
}

/**
 * Search parameters for staff
 */
export interface StaffSearchParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: "active" | "inactive";
}

/**
 * Create staff request payload
 */
export interface CreateStaffPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role_id: number;
  password: string;
  password_confirmation: string;
  vendor_location_id?: number;
  vendor_location_ids?: number[];
}

/**
 * Update staff request payload
 */
export interface UpdateStaffPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  role_id?: number;
  role?: string;
  status?: "active" | "inactive";
  password?: string;
  password_confirmation?: string;
  phone?: string;
  vendor_location_id?: number;
  vendor_location_ids?: number[];
}

/**
 * Create/Update staff response
 */
export interface StaffActionResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  errors?: string[];
}
