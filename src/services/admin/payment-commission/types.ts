/** GET/PUT /admin/payment-settings/commission */

export interface AdminPlatformCommissionData {
  default_commission_percentage: number;
  default_commission_flat_fee: number;
}

export interface AdminPlatformCommissionResponse {
  status: boolean;
  message: string;
  data: AdminPlatformCommissionData;
  errors: unknown[];
}

export interface AdminPlatformCommissionUpdatePayload {
  default_commission_percentage: number;
  default_commission_flat_fee: number;
}
