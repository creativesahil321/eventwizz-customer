import { api } from "@/services/core/api-client";
import type {
  AdminAiModelsResponse,
  AdminAiProviderUpsertPayload,
  AdminAiSettingsResponse,
} from "./types";

/** Path after `NEXT_PUBLIC_API_URL` (`…/api/v1`). Never pass an empty url to axios. */
const AI_PROVIDERS = "/admin/settings/ai-providers";

export const adminSettingsService = {
  getAiProviders: async (): Promise<AdminAiSettingsResponse> => {
    return api.get<AdminAiSettingsResponse>(AI_PROVIDERS, {
      returnFullResponse: true,
      suppressErrorToast: true,
    });
  },

  upsertAiProvider: async (
    payload: AdminAiProviderUpsertPayload,
  ): Promise<AdminAiSettingsResponse> => {
    return api.put<AdminAiSettingsResponse>(AI_PROVIDERS, payload, {
      returnFullResponse: true,
    });
  },

  activateAiProvider: async (
    id: string,
  ): Promise<AdminAiSettingsResponse> => {
    return api.post<AdminAiSettingsResponse>(
      `${AI_PROVIDERS}/${id}/activate`,
      undefined,
      { returnFullResponse: true },
    );
  },

  deleteAiProvider: async (
    id: string,
  ): Promise<AdminAiSettingsResponse> => {
    return api.delete<AdminAiSettingsResponse>(`${AI_PROVIDERS}/${id}`, {
      returnFullResponse: true,
    });
  },

  /** Uses the stored (encrypted) key on the backend to list current models. */
  listAiModels: async (id: string): Promise<AdminAiModelsResponse> => {
    return api.get<AdminAiModelsResponse>(`${AI_PROVIDERS}/${id}/models`, {
      returnFullResponse: true,
      suppressErrorToast: true,
    });
  },
};
