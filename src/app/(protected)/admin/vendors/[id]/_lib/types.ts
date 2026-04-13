/**
 * Types for Admin Manage Venue Details page.
 * One venue can have multiple locations; we show one location at a time (selected).
 */

export interface LocationFinancialSummary {
  totalEvents: number;
  totalCustomers: number;
  commissionEarned: number;
  pendingCommission: number;
  liveEvents: number;
  totalRevenue: number;
  payoutReleased: number;
}

export interface VenueLocation {
  id: number;
  name: string;
  address: string;
  city?: string;
  postcode?: string;
  country?: string;
  /** Optional; for display only, no map used */
  latitude?: number;
  longitude?: number;
  /** Stats for this location; when set, Financial & Event Summary shows these instead of venue totals */
  financialSummary?: LocationFinancialSummary;
}

function commaSeparatedParts(s: string): string[] {
  return s.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
}

/** City from API field, or last segment when `name` is "Venue, City" (common API shape). */
export function getVenueLocationCityDisplay(
  loc: Pick<VenueLocation, "name" | "city">,
): string | undefined {
  const city = loc.city?.trim();
  if (city) return city;
  const parts = commaSeparatedParts(loc.name);
  if (parts.length >= 2) return parts[parts.length - 1];
  return undefined;
}

/** Location picker + "Per:" — city only; falls back to full name when no city can be inferred */
export function formatVenueLocationLabel(
  loc: Pick<VenueLocation, "name" | "city">,
): string {
  return getVenueLocationCityDisplay(loc) ?? loc.name.trim();
}

/** Bold line under picker: venue name without trailing ", City" when city is duplicated in `name` */
export function formatVenueLocationVenueTitle(
  loc: Pick<VenueLocation, "name" | "city">,
): string {
  const city = loc.city?.trim();
  const name = loc.name.trim();
  if (city) {
    if (name.endsWith(`, ${city}`)) {
      return name.slice(0, name.length - (`, ${city}`).length).trim();
    }
    return name;
  }
  const parts = commaSeparatedParts(name);
  if (parts.length >= 2) {
    return parts.slice(0, -1).join(", ");
  }
  return name;
}

/** City/postcode/country line for address card (city from field or parsed from `name`). */
export function formatVenueLocationLocalityLine(
  loc: Pick<VenueLocation, "name" | "city" | "postcode" | "country">,
): string | null {
  const city = getVenueLocationCityDisplay(loc);
  const postcode = loc.postcode?.trim();
  const head = [city, postcode].filter(Boolean).join(", ");
  const country = loc.country?.trim();
  if (!head && !country) return null;
  if (head && country) return `${head}, ${country}`;
  return head || country || null;
}

export type EventApprovalStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested";

export interface VenueRecentEvent {
  id: number;
  title: string;
  date: string;
  locationAddress?: string;
  approvalStatus?: EventApprovalStatus;
}

export type EventCancellationRequestStatus =
  | "pending_review"
  | "approved"
  | "disapproved";

export interface VenueEventCancellationRequest {
  eventId: number;
  eventDateId: number;
  eventName: string;
  eventDate: string;
  requestedBy: string;
  requestedAt: string;
  requestedAtRaw?: string;
  cancellationReason?: string;
  status: EventCancellationRequestStatus;
  actions: {
    canApprove: boolean;
    canDisapprove: boolean;
  };
}

export interface VenueCommissionSettings {
  useCustomCommission: boolean;
  commissionPercentage: number | null;
  commissionFlatFee: number | null;
}

export interface VenueDetail {
  id: number;
  /** Backend user/vendor id — use this for impersonation API, not id (venue pk) */
  vendorId: number;
  venueId: string;
  name: string;
  image: string;
  status: "active" | "disabled";
  subdomain: string;
  /** Primary/first location is the default shown */
  locations: VenueLocation[];
  contact: {
    name: string;
    email: string;
    phone: string;
    registeredAddress: string;
  };
  businessDocuments: {
    vatNumber: string;
    kycStatus: "verified" | "pending" | "rejected";
    documentUrl?: string;
    documentLabel?: string;
  };
  recentEvents: VenueRecentEvent[];
  eventCancellationRequests: VenueEventCancellationRequest[];
  adminNotes: string[];
  /** Fallback when a location has no financialSummary (e.g. venue-wide totals) */
  financialSummary: LocationFinancialSummary;
  lastLogin?: string;
  /** Domain/subdomain approval request for admin to approve or reject */
  domainApprovalRequest?: {
    requestedDomain: string;
    status: "pending" | "approved" | "rejected";
  };
  commissionSettings: VenueCommissionSettings;
}
