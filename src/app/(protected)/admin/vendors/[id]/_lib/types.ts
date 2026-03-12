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

export interface VenueDetail {
  id: number;
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
  recentEvents: { title: string; date: string }[];
  adminNotes: string[];
  /** Fallback when a location has no financialSummary (e.g. venue-wide totals) */
  financialSummary: LocationFinancialSummary;
  lastLogin?: string;
  /** Domain/subdomain approval request for admin to approve or reject */
  domainApprovalRequest?: {
    requestedDomain: string;
    status: "pending" | "approved" | "rejected";
  };
}
