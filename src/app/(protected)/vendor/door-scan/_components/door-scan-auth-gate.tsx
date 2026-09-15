"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { DoorScanLoginScreen } from "./door-scan-login-screen";
import { Skeleton } from "@/components/ui/skeleton";

function DoorScanGateFallback() {
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-16">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function DoorScanAuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const signedOutWrongRole = useRef(false);
  const accountType = session?.user?.account_type;
  const isVendor = status === "authenticated" && accountType === "vendor";

  useEffect(() => {
    if (status !== "authenticated") return;
    if (accountType === "vendor") return;
    if (signedOutWrongRole.current) return;
    signedOutWrongRole.current = true;
    void signOut({ redirect: false });
  }, [accountType, status]);

  if (status === "loading") {
    return <DoorScanGateFallback />;
  }

  if (!isVendor) {
    return <DoorScanLoginScreen />;
  }

  return <>{children}</>;
}
