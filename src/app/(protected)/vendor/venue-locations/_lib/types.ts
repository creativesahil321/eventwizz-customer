import { Row } from "@tanstack/react-table";

// Type for search parameters
export interface SearchParams {
  page?: string;
  per_page?: string;
  search?: string;
  status?: string;
  sort?: string;
  order?: string;
}

// Type for API response pagination
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

// Type for location data
export interface VenueLocation {
  id: number;
  name: string;
  slug: string;
  email?: string;
  contact_number?: string;
  address?: string;
  city?: string;
  logo?: string;
  cover_image?: string;
  is_default: boolean;
  /** Fixed head office — does not change when switching working location */
  is_headquarters?: boolean;
  status?: boolean; // Dynamic status field: true = Active, false = Inactive
  /** Live/active events currently tied to this location */
  active_events_count?: number;
  created_at?: string;
  updated_at?: string;
}

// Type for row action handling
export type DataTableRowAction<TData> = {
  type: "update" | "view" | "setDefault" | "delete";
  row: Row<TData>;
};

// Mutation for toggle status
export type ToggleLocationStatusMutation = {
  mutate: (variables: { location_id: number | string; status: "active" | "inactive" }) => void;
  isPending: boolean;
};

// Type for API success response
export interface ApiSuccessResponse {
  status: boolean;
  message: string;
}

// Aliases for easier use
export type Location = VenueLocation;
export type LocationRowAction = DataTableRowAction<Location>;
