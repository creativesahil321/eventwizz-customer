import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  keepPreviousData,
} from "@tanstack/react-query";
import { customersService } from "@/services/vendor/customers/customers.service";
import {
  SearchParams,
  CustomerResponse,
  CustomerCreatePayload,
  CustomerUpdatePayload,
} from "./types";
import {
  CustomerCreateResponse,
  CustomerUpdateResponse,
  CustomerDeleteResponse,
} from "@/services/vendor/customers/types";

// Query keys for customers
export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (filters: SearchParams) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: number) => [...customerKeys.details(), id] as const,
};

type ExtendedUseQueryOptions<
  TData,
  TError,
  TQueryFnData,
  TQueryKey extends readonly unknown[]
> = UseQueryOptions<TData, TError, TQueryFnData, TQueryKey> & {
  keepPreviousData?: boolean;
};

export const useCustomers = (
  params: SearchParams,
  initialData?: CustomerResponse,
  options?: ExtendedUseQueryOptions<
    CustomerResponse,
    Error,
    CustomerResponse,
    ReturnType<typeof customerKeys.list>
  >
) => {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: async () => {
      const response = await customersService.getCustomers(params);
      return response;
    },
    placeholderData: keepPreviousData,
    initialData,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation<CustomerCreateResponse, Error, CustomerCreatePayload>({
    mutationFn: async (data: CustomerCreatePayload) => {
      const response = await customersService.createCustomer(data);
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch customers list
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Error creating customer:", error);
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CustomerUpdateResponse,
    Error,
    { id: number; data: CustomerUpdatePayload }
  >({
    mutationFn: async ({ id, data }) => {
      const response = await customersService.updateCustomer(id, data);
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific customer query and lists
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Error updating customer:", error);
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation<CustomerDeleteResponse, Error, number>({
    mutationFn: async (id: number) => {
      const response = await customersService.deleteCustomer(id);
      return response;
    },
    onSuccess: (_, id) => {
      // Invalidate specific customer query and lists
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Error deleting customer:", error);
    },
  });
};

export const useSendEmailToCustomer = () => {
  return useMutation<
    { status: boolean; message: string; data: unknown },
    Error,
    {
      customerId: number | string;
      emailData: { subject: string; message: string; attachments?: File[] };
    }
  >({
    mutationFn: async ({ customerId, emailData }) => {
      const response = await customersService.sendEmailToCustomer(
        customerId.toString(),
        emailData
      );
      return response;
    },
    onError: (error: Error) => {
      console.error("Error sending email to customer:", error);
    },
  });
};

export const useRestoreCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { status: boolean; message: string; data: unknown },
    Error,
    number
  >({
    mutationFn: async (id: number) => {
      const response = await customersService.restoreCustomer(id);
      return response;
    },
    onSuccess: (_, id) => {
      // Invalidate customer queries to refresh the list
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Error restoring customer:", error);
    },
  });
};

export const usePermanentDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { status: boolean; message: string; data: unknown },
    Error,
    number
  >({
    mutationFn: async (id: number) => {
      const response = await customersService.permanentDeleteCustomer(id);
      return response;
    },
    onSuccess: (_, id) => {
      // Invalidate customer queries to refresh the list
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Error permanently deleting customer:", error);
    },
  });
};

export const useSendBulkEmailToAllCustomers = () => {
  return useMutation<
    { status: boolean; message: string; data: unknown },
    Error,
    { subject: string; body: string; attachments?: File[] }
  >({
    mutationFn: async (emailData) => {
      const response = await customersService.sendBulkEmailToAllCustomers(
        emailData
      );
      return response;
    },
    onError: (error: Error) => {
      console.error("Error sending bulk email to all customers:", error);
    },
  });
};

export const useBulkActivateCustomers = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { status: boolean; message: string; data: unknown },
    Error,
    (number | string)[]
  >({
    mutationFn: async (customerIds) => {
      const response = await customersService.bulkActivateCustomers(customerIds);
      return response;
    },
    onSuccess: () => {
      // Invalidate customers list to refresh data
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Error bulk activating customers:", error);
    },
  });
};

export const useBulkDeactivateCustomers = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { status: boolean; message: string; data: unknown },
    Error,
    (number | string)[]
  >({
    mutationFn: async (customerIds) => {
      const response = await customersService.bulkDeactivateCustomers(customerIds);
      return response;
    },
    onSuccess: () => {
      // Invalidate customers list to refresh data
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Error bulk deactivating customers:", error);
    },
  });
};

export const useBulkDeleteCustomers = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { status: boolean; message: string; data: unknown },
    Error,
    (number | string)[]
  >({
    mutationFn: async (customerIds) => {
      const response = await customersService.bulkDeleteCustomers(customerIds);
      return response;
    },
    onSuccess: () => {
      // Invalidate customers list to refresh data
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Error bulk deleting customers:", error);
    },
  });
};

export const useBulkRestoreCustomers = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { status: boolean; message: string; data: unknown },
    Error,
    (number | string)[]
  >({
    mutationFn: async (customerIds) => {
      const response = await customersService.bulkRestoreCustomers(customerIds);
      return response;
    },
    onSuccess: () => {
      // Invalidate customers list to refresh data
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Error bulk restoring customers:", error);
    },
  });
};

export const useExportCustomersCSV = () => {
  return useMutation<Blob, Error, { search?: string; status?: string }>({
    mutationFn: async (params) => {
      const blob = await customersService.exportCustomersCSV(params);
      return blob;
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "customers.csv";
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (error: Error) => {
      console.error("Error exporting customers CSV:", error);
    },
  });
};
