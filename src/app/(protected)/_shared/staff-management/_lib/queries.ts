import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { staffManagementService } from "@/services/common/staff-management/staff-management.service";
import {
  CreateStaffPayload,
  StaffMember,
  StaffResponse,
  StaffSearchParams,
  UpdateStaffPayload,
} from "@/services/common/staff-management/type";
import { normalizeStaffApiPayload } from "@/services/common/staff-management/normalize-staff";

// Query keys for staff management
export const staffKeys = {
  all: ["staff"] as const,
  lists: () => [...staffKeys.all, "list"] as const,
  list: (filters: StaffSearchParams) =>
    [...staffKeys.lists(), filters] as const,
  details: () => [...staffKeys.all, "detail"] as const,
  detail: (id: number) => [...staffKeys.details(), id] as const,
};

/**
 * Hook to fetch staff members
 */
export const useStaff = (
  params?: StaffSearchParams,
  options?: Omit<
    UseQueryOptions<StaffResponse, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: staffKeys.list(params || {}),
    queryFn: async () => {
      const response = await staffManagementService.getStaff(params);
      if (!response?.status) {
        throw new Error(
          typeof response?.message === "string"
            ? response.message
            : "Failed to fetch staff members"
        );
      }
      const raw = response.data;
      const list = Array.isArray(raw)
        ? raw.map((row) => normalizeStaffApiPayload(row))
        : [];
      return {
        ...response,
        data: list,
      };
    },
    ...options,
  });
};

/**
 * Hook to fetch a specific staff member by ID
 */
export const useStaffById = (
  id: number,
  options?: Omit<
    UseQueryOptions<StaffMember, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: staffKeys.detail(id),
    queryFn: async () => {
      const response = await staffManagementService.getStaffById(id);
      if (!response?.status || response.data == null) {
        throw new Error(
          typeof response?.message === "string"
            ? response.message
            : "Failed to fetch staff member"
        );
      }
      return normalizeStaffApiPayload(response.data);
    },
    enabled: Number.isFinite(id) && id > 0,
    ...options,
  });
};

/**
 * Hook to create a new staff member
 */
export const useCreateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStaffPayload) => {
      const response = await staffManagementService.createStaff(data);
      return response;
    },
    onSuccess: () => {
      // Invalidate staff list queries to refetch
      queryClient.invalidateQueries({
        queryKey: staffKeys.lists(),
      });
      // Toast handled by axios interceptor
    },
    onError: (error) => {
      console.error("Error creating staff:", error);
      // Toast handled by axios interceptor
    },
  });
};

/**
 * Hook to update an existing staff member
 */
export const useUpdateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateStaffPayload;
    }) => {
      const response = await staffManagementService.updateStaff(id, data);
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific staff member query and lists
      queryClient.invalidateQueries({
        queryKey: staffKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: staffKeys.lists(),
      });
      // Toast handled by axios interceptor
    },
    onError: (error) => {
      console.error("Error updating staff:", error);
      // Toast handled by axios interceptor
    },
  });
};

/**
 * Hook to delete a staff member
 */
export const useDeleteStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await staffManagementService.deleteStaff(id);
      return response;
    },
    onSuccess: () => {
      // Invalidate staff list queries to refetch
      queryClient.invalidateQueries({
        queryKey: staffKeys.lists(),
      });
      // Toast handled by axios interceptor
    },
    onError: (error) => {
      console.error("Error deleting staff:", error);
      // Toast handled by axios interceptor
    },
  });
};

/**
 * Hook to update a staff member's status
 */
export const useUpdateStaffStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: "active" | "inactive";
    }) => {
      const response = await staffManagementService.updateStaffStatus(
        id,
        status
      );
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific staff member query and lists
      queryClient.invalidateQueries({
        queryKey: staffKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: staffKeys.lists(),
      });
      // Toast handled by axios interceptor
    },
    onError: (error) => {
      console.error("Error updating staff status:", error);
      // Toast handled by axios interceptor
    },
  });
};
