/**
 * Impersonation API types — matches Laravel backend DTOs.
 */

export interface ImpersonateVendorPayload {
  vendor_id: number;
}

export interface ImpersonateVendorUser {
  uuid: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  status: string;
}

export interface ImpersonateVendorData {
  token: string;
  user: ImpersonateVendorUser;
  account_type: "vendor";
  active_role: string;
  isOnboarded: boolean;
  on_boarding_step?: number;
  vendor_location_id: number | null;
  permissions: string[];
  has_payment_provider: boolean;
  vendor_id: number;
  vendor_name: string;
}

export interface ImpersonateVendorResponse {
  status: boolean;
  message: string;
  data: ImpersonateVendorData;
  errors: unknown[];
}

export interface ExitImpersonationResponse {
  status: boolean;
  message: string;
  data: null;
  errors: unknown[];
}
