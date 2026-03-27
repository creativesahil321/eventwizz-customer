import type { EventDetailData } from "@/services/vendor/events/type";

export interface AdminEventShowResponse {
  status: boolean;
  message: string;
  data: EventDetailData;
  errors: unknown[];
}

export interface AdminEventActionResponse {
  status: boolean;
  message: string;
  data?: {
    id?: number;
    approval_status?: string;
    [key: string]: unknown;
  };
  errors: unknown[];
}

export interface AdminRejectEventPayload {
  reason: string;
}

export interface AdminRequestChangesPayload {
  message: string;
}
