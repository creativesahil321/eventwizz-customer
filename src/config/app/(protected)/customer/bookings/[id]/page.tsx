"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PageLoader } from "@/components/ui/page-loader";
import AdjustBookingContent from "./_components/adjust-booking-content";

function AdjustBookingPage() {
  const params = useParams();
  // Route param is booking_number (e.g. EV-080), not numeric booking_id
  const bookingNumber = params.id as string;

  return <AdjustBookingContent bookingNumber={bookingNumber} />;
}

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdjustBookingPage />
    </Suspense>
  );
}
