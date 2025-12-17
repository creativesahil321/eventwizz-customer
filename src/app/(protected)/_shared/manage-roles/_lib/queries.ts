import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { manageRolesService } from "@/services/common/manage-roles/manage-roles.service";
import { CreateRolePayload } from "@/services/common/manage-roles/type";

// Define query keys for roles and permissions
export const rolesKeys = {
  all: ["roles"] as const,
  lists: () => [...rolesKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...rolesKeys.lists(), filters] as const,
  details: () => [...rolesKeys.all, "detail"] as const,
  detail: (id: number) => [...rolesKeys.details(), id] as const,
  permissions: () => [...rolesKeys.all, "permissions"] as const,
};

/**
 * Hook to fetch permissions
 */
export function usePermissions() {
  return useQuery({
    queryKey: rolesKeys.permissions(),
    queryFn: async () => {
      const response = await manageRolesService.getPermissions();
      if (response?.status) {
        return response.data;
      }
      throw new Error(response?.message || "Failed to fetch permissions");
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 1, // Reduce unnecessary retries
  });
}

/**
 * Hook to fetch roles with optional filters
 */
export function useRoles(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: rolesKeys.list(filters),
    queryFn: async () => {
      const response = await manageRolesService.getRoles(filters);
      if (response?.status) {
        return response.data;
      }
      throw new Error(response?.message || "Failed to fetch roles");
    },
  });
}

/**
 * Hook to fetch a specific role by ID
 */
export function useRole(id: number) {
  return useQuery({
    queryKey: rolesKeys.detail(id),
    queryFn: async () => {
      const response = await manageRolesService.getRoleById(id);
      if (response?.status) {
        return response.data;
      }
      throw new Error(response?.message || "Failed to fetch role");
    },
    enabled: !!id, // Only run the query if an ID is provided
  });
}

/**
 * Hook to create a new role
 */
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRolePayload) => {
      return manageRolesService.createRole(data);
    },
    onSuccess: () => {
      // Invalidate and refetch roles list
      queryClient.invalidateQueries({ queryKey: rolesKeys.lists() });
    },
  });
}

/**
 * Hook to update an existing role
 */
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      id: number;
      permissions: number[];
      slug?: string;
      label?: string;
    }) => {
      const payload: Partial<CreateRolePayload> = {
        permissions: params.permissions,
      };

      // Add slug and label if provided
      if (params.slug) payload.slug = params.slug;
      if (params.label) payload.label = params.label;

      return manageRolesService.updateRole(params.id, payload);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch the specific role and the roles list
      queryClient.invalidateQueries({
        queryKey: rolesKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: rolesKeys.lists() });
    },
  });
}

/**
 * Hook to delete a role
 */
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => {
      return manageRolesService.deleteRole(id);
    },
    onSuccess: () => {
      // Invalidate and refetch roles list
      queryClient.invalidateQueries({ queryKey: rolesKeys.lists() });
      // Show success toast or notification
    },
    onError: () => {},
  });
}
