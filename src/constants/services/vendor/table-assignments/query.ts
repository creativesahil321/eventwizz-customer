import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { tableAssignmentsService } from "./table-assignments.service";
import type {
  TableAssignmentsQueryParams,
  TableAssignmentsResponse,
} from "./type";

export const tableAssignmentsKeys = {
  all: ["tableAssignments"] as const,
  lists: () => [...tableAssignmentsKeys.all, "list"] as const,
  list: (params: TableAssignmentsQueryParams) =>
    [...tableAssignmentsKeys.lists(), params] as const,
};

export const useTableAssignments = (
  params: TableAssignmentsQueryParams | undefined,
  options?: Omit<
    UseQueryOptions<
      TableAssignmentsResponse,
      Error,
      TableAssignmentsResponse,
      ReturnType<typeof tableAssignmentsKeys.list>
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery({
    queryKey: tableAssignmentsKeys.list(
      (params ?? { event: "", date: "" }) as TableAssignmentsQueryParams,
    ),
    enabled:
      Boolean(params?.event) &&
      Boolean(params?.date) &&
      (options?.enabled ?? true),
    queryFn: async () => {
      if (!params) {
        throw new Error("Missing table assignment params");
      }
      return tableAssignmentsService.list(params);
    },
    retry: 1,
    staleTime: 30 * 1000,
    /** Same as booking history: keep table visible while search/filters refetch. */
    placeholderData: keepPreviousData,
    ...options,
  });
};

export const useConfirmTableAssignments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      bookingDateId: number | string;
      finalTablesBySlotKey?: Record<string, string>;
      tempTables?: string[];
      finalTables?: string[];
    }) => tableAssignmentsService.confirmBookingDate(params),
    onSuccess: () => {
      // Keep it simple: refresh all table-assignment lists
      queryClient.invalidateQueries({ queryKey: tableAssignmentsKeys.lists() });
    },
  });
};

export const useUploadSeatingPlanImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      bookingDateId: number | string;
      file: File;
    }) => tableAssignmentsService.uploadSeatingPlanImage(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableAssignmentsKeys.lists() });
    },
  });
};

export const useDeleteFinalAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      bookingDateId: number | string;
      tempTable: string;
    }) => tableAssignmentsService.deleteFinalAssignment(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableAssignmentsKeys.lists() });
    },
  });
};

