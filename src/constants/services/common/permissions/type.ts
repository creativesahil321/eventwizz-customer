/**
 * Permissions API response
 */
export interface PermissionsResponse {
  status: boolean;
  message: string;
  data: {
    permissions: string[];
  };
  errors: string[];
}

/**
 * Type for permissions API return data
 */
export type PermissionData = string[];
