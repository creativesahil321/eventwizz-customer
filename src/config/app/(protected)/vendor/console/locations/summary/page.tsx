"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/page-loader";

export default function ProtectedLocationRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new welcome version page
    router.replace("/welcome/select-location");
  }, [router]);

  // Show loader while redirecting
  return (
    <div className="flex justify-center items-center min-h-screen">
      <PageLoader />
    </div>
  );
}
