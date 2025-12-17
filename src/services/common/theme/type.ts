/**
 * Theme Service Type Definitions
 *
 * Contains service-specific types needed for the theme service.
 */

export interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T | null;
  errors?: string[];
}

export interface ServiceResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T | null;
}

export interface ThemeRequest {
  domain_name: string;
}

export interface CacheEntry<T> {
  data: T | null;
  timestamp: number;
  error: boolean;
}
