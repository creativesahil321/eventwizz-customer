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
  custom_permissions?: string[];
  permissions?: Array<{ key: string; name?: string }>;
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
  custom_permissions?: string[];
  permissions?: string[];
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
  custom_permissions?: string[];
  permissions?: string[];
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
