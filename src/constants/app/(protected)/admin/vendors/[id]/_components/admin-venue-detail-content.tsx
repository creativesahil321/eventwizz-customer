"use client";

import { notFound } from "next/navigation";
import { ManageVenueDetails } from "./manage-venue-details";
import { ManageVenueDetailsSkeleton } from "./manage-venue-details-skeleton";
import { useAdminVenueById } from "../_lib/use-admin-venue-by-id";

export function AdminVenueDetailContent({ id }: { id: string }) {
  const { venue, isLoading, isError } = useAdminVenueById(id);

  if (id == null || id === "") notFound();
  if (isError) notFound();
  if (isLoading) return <ManageVenueDetailsSkeleton />;
  if (venue == null) notFound();

  return <ManageVenueDetails venue={venue} />;
}
