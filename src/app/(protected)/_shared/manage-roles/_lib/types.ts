export type SearchParams = {
  page?: string;
  per_page?: string;
};

export type Permission = {
  id?: number;
  title: string;
  slug: string;
  label?: string;
  key?: string;
  icon?: string;
  permissions?: string[];
};

export type Role = {
  id: number;
  title: string;
  name: string;
  permissions: Permission[];
  description: string;
  slug?: string;
  label?: string;
};

export type RolesData = {
  admin: Role;
  manager: Role;
  dealing: Role;
  support: Role;
};

// Add a PermissionItem interface for use in the PermissionGroup
export interface PermissionItem {
  id?: number;
  slug: string;
  label: string;
  key?: string;
  title?: string;
}

// Update or create the PermissionGroup interface for use in the PermissionsDialog
export interface PermissionGroup {
  title: string;
  slug?: string;
  icon?: string;
  permission: Permission[];
}

// Processed permission group for UI display
export interface ProcessedPermissionGroup {
  title: string;
  slug: string;
  icon?: string;
  permissions: PermissionItem[];
}
