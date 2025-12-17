"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PageLoader } from "@/components/ui/page-loader";
import AdjustBookingContent from "./_components/adjust-booking-content";

function AdjustBookingPage() {
  const params = useParams();
  const bookingId = params.id as string;

  // TODO: Fetch booking data from API using bookingId
  // const { data: bookingData, isLoading } = useGetBookingData(bookingId);

  return <AdjustBookingContent bookingId={bookingId} />;
}

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdjustBookingPage />
    </Suspense>
  );
}
