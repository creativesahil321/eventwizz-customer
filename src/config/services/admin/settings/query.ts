import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeAdminModelList } from "@/lib/ai/model-catalog";
import { adminSettingsService } from "./settings.service";
import type { AdminAiProviderUpsertPayload } from "./types";

export const adminSettingsKeys = {
  all: ["admin", "settings"] as const,
  aiProviders: () => [...adminSettingsKeys.all, "ai-providers"] as const,
  aiModels: (id: string) =>
    [...adminSettingsKeys.all, "ai-models", id] as const,
};

export function useAdminAiProviders() {
  return useQuery({
    queryKey: adminSettingsKeys.aiProviders(),
    queryFn: async () => {
      const res = await adminSettingsService.getAiProviders();
      return res.data;
    },
    retry: false,
  });
}

export function useAdminAiModels(providerId: string, enabled: boolean) {
  return useQuery({
    queryKey: adminSettingsKeys.aiModels(providerId),
    queryFn: async () => {
      const res = await adminSettingsService.listAiModels(providerId);
      return normalizeAdminModelList(res.data?.models);
    },
    enabled: enabled && Boolean(providerId),
    retry: false,
  });
}

export function useUpsertAiProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminAiProviderUpsertPayload) =>
      adminSettingsService.upsertAiProvider(payload),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({
        queryKey: adminSettingsKeys.aiProviders(),
      });
      queryClient.invalidateQueries({
        queryKey: adminSettingsKeys.aiModels(payload.id),
      });
    },
  });
}

export function useActivateAiProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminSettingsService.activateAiProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminSettingsKeys.aiProviders(),
      });
    },
  });
}

export function useDeleteAiProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminSettingsService.deleteAiProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: adminSettingsKeys.aiProviders(),
      });
    },
  });
}
