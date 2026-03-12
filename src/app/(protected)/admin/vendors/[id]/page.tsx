import { Shell } from "@/components/shell";
import { AdminVenueDetailContent } from "./_components/admin-venue-detail-content";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminVenueDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <section className="page text-black min-w-0">
      <Shell className="gap-6">
        <AdminVenueDetailContent id={id} />
      </Shell>
    </section>
  );
}
