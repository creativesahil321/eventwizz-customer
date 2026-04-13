"use client";

import { useParams, useRouter } from "next/navigation";
import { UnifiedRegisterForm } from "@/app/(auth)/auth/register/_components/UnifiedRegisterForm";
import { useEffect } from "react";
import { appConfig } from "@/config/app";
import { useDomain } from "@/providers/domain-provider/domain-provider";

export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const { settings } = useDomain();
  const siteName = settings?.name || appConfig.name;
  const accountType = params.accountType as string;

  // Validate account type is supported
  useEffect(() => {
    if (accountType !== "customer" && accountType !== "vendor") {
      // Redirect to default registration path
      router.replace("/auth/register");
    }
  }, [accountType, router]);

  // If invalid account type, show loading until redirect happens
  if (accountType !== "customer" && accountType !== "vendor") {
    return null;
  }

  return (
    <>
      <div className="flex flex-col space-y-2 text-center mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-black">
          {accountType === "vendor"
            ? "Create Vendor Account"
            : "Create Customer Account"}
        </h1>
        <p className="text-sm text-black">
          {accountType === "vendor"
            ? `Start offering your services on ${siteName}`
            : `Join ${siteName} to find and book amazing events`}
        </p>
      </div>

      <div className="grid gap-6 w-full max-w-sm mx-auto">
        <UnifiedRegisterForm
          accountType={accountType as "customer" | "vendor"}
        />
      </div>
    </>
  );
}
