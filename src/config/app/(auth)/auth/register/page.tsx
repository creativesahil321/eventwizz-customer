"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { AuthRegisterSkeleton } from "../../_components/auth-register-skeleton";

export default function RegisterDefaultPage() {
  const router = useRouter();
  const { website_role, isLoading } = useDomain();

  useEffect(() => {
    if (isLoading) return;

    // Determine registration type based on domain
    let accountTypeForRegistration = "customer";

    if (["admin"].includes(website_role || "")) {
      accountTypeForRegistration = "vendor";
    }

    // Redirect to the appropriate registration page
    router.replace(`/auth/register/${accountTypeForRegistration}`);
  }, [router, website_role, isLoading]);

  return <AuthRegisterSkeleton />;
}
