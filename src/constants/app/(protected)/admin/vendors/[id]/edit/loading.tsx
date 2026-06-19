import { Shell } from "@/components/shell";
import { ManageVenueDetailsSkeleton } from "../_components/manage-venue-details-skeleton";

export default function AdminVenueEditLoading() {
  return (
    <section className="page text-black min-w-0">
      <Shell className="gap-6">
        <ManageVenueDetailsSkeleton />
      </Shell>
    </section>
  );
}
