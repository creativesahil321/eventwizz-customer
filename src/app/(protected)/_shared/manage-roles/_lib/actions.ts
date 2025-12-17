"use client";

import { manageRolesService } from "@/services/common/manage-roles/manage-roles.service";
import {
  CreateRolePayload,
  PermissionGroup,
  Role,
} from "@/services/common/manage-roles/type";

/**
 * Fetch roles from the API
 */
export const fetchRoles = async () => {
  try {
    const response = await manageRolesService.getRoles();

    if (!response.status) {
      console.error("Error fetching roles:", response.message);
      return {};
    }

    // Convert array of roles to a record for easier access
    const rolesRecord: Record<string, Role> = {};
    response.data.forEach((role) => {
      rolesRecord[role.slug] = {
        id: role.id,
        label: role.label,
        slug: role.slug,
        permissions: role.permissions || [], // Use permissions directly from API
      };
    });

    // Populate permissions for each role
    const permissionsResponse = await manageRolesService.getPermissions();
    if (permissionsResponse.status) {
      const allPermissions = permissionsResponse.data.flatMap(
        (group) => group.permission
      );

      // Add permissions data to each role
      Object.keys(rolesRecord).forEach((slug) => {
        const role = rolesRecord[slug];
        role.permissions = allPermissions.flatMap((group) => group.permission);
      });
    }

    return rolesRecord;
  } catch (error) {
    console.error("Error fetching roles:", error);
    return {};
  }
};

/**
 * Fetch permissions from the API
 */
export const fetchPermissions = async (): Promise<PermissionGroup[]> => {
  try {
    const response = await manageRolesService.getPermissions();

    if (!response.status) {
      console.error("Error fetching permissions:", response.message);
      return [];
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return [];
  }
};

/**
 * Create a new role with permissions
 */
export const createRole = async (payload: CreateRolePayload) => {
  try {
    const response = await manageRolesService.createRole(payload);
    return response;
  } catch (error) {
    console.error("Error creating role:", error);
    return {
      status: false,
      message: "Failed to create role",
      errors: ["An unexpected error occurred"],
    };
  }
};
