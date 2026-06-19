/**
 * Email Template Service Type Definitions
 */

export interface EmailTemplate {
  id: number;
  user_id?: number;
  name: string;
  slug?: string;
  for?: string;
  banner?: string | null;
  title: string;
  subject: string;
  body?: string;
  signature?: string;
  salutation?: string;
  message_body?: string;
  footer_status?: number;
  footer_body?: string;
  button_level?: string;
  button_link?: string;
  bottom_status?: number;
  bottom_title?: string;
  bottom_body?: string;
  short_codes?: string[];
  status: number | string;
  created_at?: string | null;
  updated_at?: string | null;

  // Fields used in UI display
  who_received?: string;
  when_received?: string;
}

/**
 * Pagination links returned by the API
 */
export interface PaginationLinks {
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
}

/**
 * Pagination meta information returned by the API
 */
export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

/**
 * Paginated response structure from the API
 */
export interface PaginatedResponse<T> {
  data: T[];
  links: PaginationLinks;
  meta: PaginationMeta;
}

/**
 * Email template list response from the API
 */
export interface EmailTemplateListResponse {
  data: PaginatedResponse<EmailTemplate>;
}

export interface EmailTemplateCreateRequest {
  name: string;
  subject: string;
  body: string;
}

export interface EmailTemplateUpdateRequest {
  subject?: string;
  body?: string;
  signature?: string;
}

export interface EmailTemplateSendRequest {
  recipient_email: string;
  subject?: string;
  body?: string;
  attachments?: File[];
}

export interface EmailTemplateSendResponse {
  message: string;
}
