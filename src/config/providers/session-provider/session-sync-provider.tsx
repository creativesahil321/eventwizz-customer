"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";

export function SessionSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const { setSession, markSessionChecked, isSessionChecked } = useAuthStore();

  // Sync NextAuth session with Zustand store
  useEffect(() => {
    if (status === "authenticated" && session) {
      setSession(session);
    } else if (status === "unauthenticated") {
      setSession(null);
    }

    // Mark session as checked once we have a status
    if (status !== "loading" && !isSessionChecked) {
      markSessionChecked();
    }
  }, [session, status, setSession, markSessionChecked, isSessionChecked]);

  return children;
}
