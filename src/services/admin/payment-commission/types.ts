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

/** GET/PUT /admin/payment-settings/gocardless-collection-interval */
export const DEFAULT_GOCARDLESS_COLLECTION_INTERVAL_DAYS = 7;
export const MIN_GOCARDLESS_COLLECTION_INTERVAL_DAYS = 1;
export const MAX_GOCARDLESS_COLLECTION_INTERVAL_DAYS = 90;

export interface AdminGocardlessCollectionIntervalData {
  gocardless_collection_interval_days: number;
}

export interface AdminGocardlessCollectionIntervalResponse {
  status: boolean;
  message: string;
  data: AdminGocardlessCollectionIntervalData;
  errors: unknown[];
}

export interface AdminGocardlessCollectionIntervalUpdatePayload {
  gocardless_collection_interval_days: number;
}
