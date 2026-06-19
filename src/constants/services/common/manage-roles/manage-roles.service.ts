import { api } from "@/services/core/api-client";
import {
  PermissionsResponse,
  RolesResponse,
  SingleRoleResponse,
  CreateRolePayload,
  CreateRoleResponse,
  RoleSearchParams,
} from "./type";
import {
  getCurrentUserRole,
  getEndpointsByRole,
} from "@/lib/utils/api-endpoints";

type ManageRolesEndpoints = {
  GET_PERMISSIONS: string;
  GET_ALL: string;
  GET_UPDATE_ROLE_BY_ID: string;
  ADD_NEW_ROLE: string;
  UPDATE_ROLE: string;
  DELETE_ROLE: string;
};

/**
 * Manage Roles Service
 * Handles API calls related to roles and permissions management
 */
export const manageRolesService = {
  /**
   * Fetch all available permissions
   * @returns Promise with permissions data
   */
  getPermissions: () => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<ManageRolesEndpoints>("ROLES", role);

    return api.get<PermissionsResponse>(endpoints.GET_PERMISSIONS, {
      returnFullResponse: true,
    });
  },

  /**
   * Fetch all roles with optional search parameters
   * @param params Search parameters (page, per_page, search)
   * @returns Promise with roles data
   */
  getRoles: (params?: RoleSearchParams) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<ManageRolesEndpoints>("ROLES", role);

    return api.get<RolesResponse>(endpoints.GET_ALL, {
      params,
      returnFullResponse: true,
    });
  },

  /**
   * Fetch a specific role by ID
   * @param id Role ID
   * @returns Promise with role data
   */
  getRoleById: (id: number) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<ManageRolesEndpoints>("ROLES", role);

    const url = endpoints.GET_UPDATE_ROLE_BY_ID.replace("{id}", id.toString());
    return api.get<SingleRoleResponse>(url, {
      returnFullResponse: true,
    });
  },

  /**
   * Create a new role with permissions
   * @param data Role data including slug, label, and permissions
   * @returns Promise with created role data
   */
  createRole: (data: CreateRolePayload) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<ManageRolesEndpoints>("ROLES", role);

    return api.post<CreateRoleResponse>(endpoints.ADD_NEW_ROLE, data, {
      returnFullResponse: true,
    });
  },

  /**
   * Update an existing role
   * @param id Role ID
   * @param data Role data to update
   * @returns Promise with updated role data
   */
  updateRole: (id: number, data: Partial<CreateRolePayload>) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<ManageRolesEndpoints>("ROLES", role);

    const url = endpoints.UPDATE_ROLE.replace("{id}", id.toString());
    return api.post<CreateRoleResponse>(url, data, {
      returnFullResponse: true,
    });
  },
  /**
   * Delete a role
   * @param id Role ID to delete
   * @returns Promise with delete operation result
   */
  deleteRole: (id: number) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<ManageRolesEndpoints>("ROLES", role);

    const url = endpoints.DELETE_ROLE.replace("{id}", id.toString());
    return api
      .delete<CreateRoleResponse>(url, {
        returnFullResponse: true,
      })
      .catch((error) => {
        // Ensure we're returning a properly formatted error response
        if (error.response && error.response.data) {
          return error.response.data;
        }

        return {
          status: false,
          message: error.message || "Failed to delete role",
          errors: [],
        };
      });
  },
};
