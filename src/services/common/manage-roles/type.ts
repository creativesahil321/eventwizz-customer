/**
 * Permission model from API
 */
export interface Permission {
  id?: number;
  key?: string;
  title?: string;
  slug: string;
  label: string;
  description?: string;
  permission: Permission[];
}

/**
 * Permission group model
 */
export interface PermissionGroup {
  title: string;
  permission: Permission[];
}

/**
 * Role model
 */
export interface Role {
  id: number;
  slug: string;
  label: string;
  permissions: Permission[];
}

/**
 * Permissions API response
 */
export interface PermissionsResponse {
  status: boolean;
  message: string;
  data: PermissionGroup[];
  errors: string[];
}

/**
 * Roles API response
 */
export interface RolesResponse {
  status: boolean;
  message: string;
  data: Role[];
  errors: string[];
}

/**
 * Create role request payload
 */
export interface CreateRolePayload {
  slug: string;
  label: string;
  permissions: number[] | string[];
}

/**
 * Create role response
 */
export interface CreateRoleResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    slug: string;
    label: string;
  };
  errors: string[];
}

/**
 * Role search parameters
 */
export interface RoleSearchParams {
  page?: number | string;
  per_page?: number | string;
  search?: string;
}

/**
 * Single role API response
 */
export interface SingleRoleResponse {
  status: boolean;
  message: string;
  data: Role;
  errors: string[];
}
