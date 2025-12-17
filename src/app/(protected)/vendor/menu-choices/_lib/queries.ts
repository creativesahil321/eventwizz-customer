"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { menuChoicesService } from "@/services/vendor/menu_choices";
import { UseMenuChoicesQueryParams } from "../_lib/types";
import {
  MenuChoiceCreateResponse,
  MenuChoiceUpdateResponse,
  CreateMenuChoicePayload,
  UpdateMenuChoicePayload,
} from "@/services/vendor/menu_choices";

// Query keys for proper cache management
export const menuChoicesKeys = {
  all: ["menu-choices"] as const,
  lists: () => [...menuChoicesKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...menuChoicesKeys.lists(), filters] as const,
  details: () => [...menuChoicesKeys.all, "detail"] as const,
  detail: (id: string | number) => [...menuChoicesKeys.details(), id] as const,
};

export const useAdminMenuChoices = (params: UseMenuChoicesQueryParams = {}) => {
  const {
    search = "",
    page = 1,
    per_page = 10,
    event_type = "",
    menu = "",
    status = "",
    options = {},
  } = params;

  return useQuery({
    queryKey: menuChoicesKeys.list({
      search,
      page,
      per_page,
      event_type,
      menu,
      status,
    }),
    queryFn: async () => {
      const response = await menuChoicesService.getMenuChoices({
        search,
        page,
        per_page,
        event_type,
        menu,
        status,
      });

      return {
        status: response.status,
        data: response.data, // API already returns nested structure with { data, links, meta }
        error: response.errors || [],
        message: response.message || "Menu choices fetched successfully.",
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache freshness
    gcTime: 1000 * 60 * 10, // 10 minutes cache retention
    ...options,
  });
};

export const useMenuChoiceDetails = (id: string | number) => {
  return useQuery({
    queryKey: menuChoicesKeys.detail(id),
    queryFn: async () => {
      const response = await menuChoicesService.getMenuChoiceById(id);
      return response; // Return the full response
    },
    enabled: !!id, // Only run if id is provided
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useCreateMenuChoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMenuChoicePayload) =>
      menuChoicesService.createMenuChoice(data),
    onSuccess: (response: MenuChoiceCreateResponse) => {
      // Only invalidate if the operation was successful
      if (response.status) {
        queryClient.invalidateQueries({ queryKey: menuChoicesKeys.lists() });
      }
      return response;
    },
  });
};

export const useUpdateMenuChoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string | number;
      data: UpdateMenuChoicePayload;
    }) => menuChoicesService.updateMenuChoice(id, data),
    onSuccess: (response: MenuChoiceUpdateResponse, variables) => {
      // Only invalidate if the operation was successful
      if (response.status) {
        queryClient.invalidateQueries({
          queryKey: menuChoicesKeys.detail(variables.id),
        });
        queryClient.invalidateQueries({ queryKey: menuChoicesKeys.lists() });
      }
      return response;
    },
  });
};

export const useDeleteMenuChoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) =>
      menuChoicesService.deleteMenuChoice(id),
    onSuccess: (response) => {
      // Only invalidate if the operation was successful
      if (response.status) {
        queryClient.invalidateQueries({ queryKey: menuChoicesKeys.lists() });
      }
      return response;
    },
  });
};

export const useUpdateMenuChoiceStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status = true,
    }: {
      id: string | number;
      status?: boolean;
    }) => menuChoicesService.updateMenuChoiceStatus(id, status),
    onSuccess: (response, variables) => {
      // Only invalidate if the operation was successful
      if (response.status) {
        queryClient.invalidateQueries({
          queryKey: menuChoicesKeys.detail(variables.id),
        });
        queryClient.invalidateQueries({ queryKey: menuChoicesKeys.lists() });
      }
      return response;
    },
  });
};
