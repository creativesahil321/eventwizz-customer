import { Shell } from "@/components/shell";
import { AdminEventReviewContent } from "./_components/admin-event-review-content";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fromVendor?: string }>;
}

export default async function AdminEventReviewPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  return (
    <section className="page min-w-0 text-black">
      <Shell className="gap-6 items-start">
        <AdminEventReviewContent
          eventId={id}
          fromVendor={sp.fromVendor ?? null}
        />
      </Shell>
    </section>
  );
}
