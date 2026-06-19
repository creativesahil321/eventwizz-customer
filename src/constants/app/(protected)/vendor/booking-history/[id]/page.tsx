"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PageLoader } from "@/components/ui/page-loader";
import AdjustBookingContent from "./_components/adjust-booking-content";
import { PermissionRoute } from "@/components/permission";

function AdjustBookingPage() {
  const params = useParams();
  const bookingId = params.id as string;

  return <AdjustBookingContent bookingId={bookingId} />;
}

export default function Page() {
  return (
    <PermissionRoute
      permissionKey="read-booking"
      fallbackPath="/vendor/booking-history"
    >
      <Suspense fallback={<PageLoader />}>
        <AdjustBookingPage />
      </Suspense>
    </PermissionRoute>
  );
}
