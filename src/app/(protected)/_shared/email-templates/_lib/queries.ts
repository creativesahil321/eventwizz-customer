import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchEmailTemplateById, fetchEmailTemplates } from "./actions";
import { EmailTemplate, SearchParams } from "./types";

/**
 * Query keys for email templates
 */
export const emailTemplateKeys = {
  all: ["email-templates"] as const,
  lists: () => [...emailTemplateKeys.all, "list"] as const,
  list: (params: SearchParams) =>
    [...emailTemplateKeys.lists(), params] as const,
  details: () => [...emailTemplateKeys.all, "detail"] as const,
  detail: (id: number) => [...emailTemplateKeys.details(), id] as const,
};

/**
 * Hook to fetch a list of email templates
 */
export const useEmailTemplates = (
  params: SearchParams = {},
  initialData: EmailTemplate[] = []
) => {
  const { search = "", page = 1, per_page = 10, options = {} } = params;

  return useQuery({
    queryKey: emailTemplateKeys.list(params),
    queryFn: async () => {
      try {
        const response = await fetchEmailTemplates({
          search: search ?? "",
          page: Number(page),
          per_page: Number(per_page),
        });

        // More robust response handling to accommodate different API response structures
        if (response) {
          // If response has nested data structure (data.data)
          if (response.data && "data" in response.data) {
            return response;
          }

          // If response.data is an array
          if (response.data && Array.isArray(response.data)) {
            const defaultMeta = {
              current_page: Number(page),
              from: 1,
              last_page: 1,
              path: "",
              per_page: Number(per_page),
              to: 0,
              total: 0,
            };

            return {
              data: {
                data: response.data,
                meta: defaultMeta,
              },
            };
          }

          // If response itself is an array
          if (Array.isArray(response)) {
            return {
              data: {
                data: response,
                meta: {
                  current_page: Number(page),
                  from: 1,
                  last_page: 1,
                  path: "",
                  per_page: Number(per_page),
                  to: 0,
                  total: 0,
                },
              },
            };
          }

          return {
            data: {
              data: [],
              meta: {
                current_page: Number(page),
                from: 1,
                last_page: 1,
                path: "",
                per_page: Number(per_page),
                to: 0,
                total: 0,
              },
            },
          };
        }

        // Default empty response
        return {
          data: {
            data: [],
            meta: {
              current_page: Number(page),
              from: 1,
              last_page: 1,
              path: "",
              per_page: Number(per_page),
              to: 0,
              total: 0,
            },
          },
        };
      } catch (error) {
        throw error;
      }
    },
    initialData: initialData.length
      ? {
          data: {
            data: initialData,
            meta: {
              current_page: Number(page),
              from: 1,
              last_page: 1,
              path: "",
              per_page: Number(per_page),
              to: 0,
              total: 0,
            },
          },
        }
      : undefined,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    ...options,
  });
};

/**
 * Hook to fetch a single email template by ID
 */
export const useEmailTemplate = (id: number) => {
  return useQuery({
    queryKey: emailTemplateKeys.detail(id),
    queryFn: () => fetchEmailTemplateById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
  });
};
