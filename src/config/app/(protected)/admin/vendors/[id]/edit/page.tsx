import { Shell } from "@/components/shell";
import { AdminVenueEditContent } from "../_components/admin-venue-edit-content";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminVenueEditPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <section className="page text-black min-w-0">
      <Shell className="gap-6">
        <AdminVenueEditContent id={id} />
      </Shell>
    </section>
  );
}
