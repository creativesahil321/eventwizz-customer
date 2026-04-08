import { DefaultSession } from "next-auth";
import { UserType } from "./auth.types";
import { VenueLocation } from "./api.types";

declare module "next-auth" {
  interface Session {
    user: {
      account_type: UserType;
      active_role?: string;
      isOnboarded?: boolean;
      token?: string;
      uuid?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      id?: string;
      vendor_location_id?: number | string;
      event_id?: number | string;
      on_boarding_step?: number;
      last_completed_step?: number;
      default_venue_location?: VenueLocation;
      venue_locations?: VenueLocation[];
    } & DefaultSession["user"];
  }

  interface User {
    account_type: UserType;
    active_role?: string;
    uuid?: string;
    vendor_location_id?: number | string;
    event_id?: number | string;
    on_boarding_step?: number;
    last_completed_step?: number;
    default_venue_location?: VenueLocation;
    venue_locations?: VenueLocation[];
  }

  interface JWT {
    account_type: UserType;
    active_role?: string;
    uuid?: string;
    vendor_location_id?: number | string;
    event_id?: number | string;
    on_boarding_step?: number;
    last_completed_step?: number;
    default_venue_location?: VenueLocation;
    venue_locations?: VenueLocation[];
  }
}
