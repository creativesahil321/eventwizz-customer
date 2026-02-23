/**
 * Staff member interface
 */
export interface StaffMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role_id?: number;
  role?: string;
  status: "active" | "inactive";
  avatar?: string;
  phone?: string;
  username?: string;
  created_at?: string;
  updated_at?: string;
  vendor_location_id?: number;
  vendor_location_ids?: number[];
  /** List API: location names. Single-staff API: objects with id and city */
  locations?: string[] | { id: number; city?: string }[];
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

/**
 * Response type for staff list
 */
export interface StaffResponse {
  status: boolean;
  message: string;
  data: StaffMember[];
  meta?: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
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
