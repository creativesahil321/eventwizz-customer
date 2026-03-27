"use client";

import React, { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { Session } from "next-auth";
import { RootQueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider/ThemeContext";
import { DomainProvider } from "@/providers/domain-provider/domain-provider";
import { ThemeSchema } from "@/types/theme.types";
import NextTopLoader from "nextjs-toploader";
import { useAuthStore } from "@/store/auth.store";
import { usePermissionStore } from "@/store/permission.store";
import { PermissionProvider } from "@/providers/permission-provider/permission-provider";
import dynamic from "next/dynamic";
import { ChatBotProvider } from "@/components/chat/chat-bot-provider";
import { env } from "@/env";

// Dynamically import the permission debug component (only in development)
const PermissionDebug =
  env.NEXT_PUBLIC_NODE_ENV === "development"
    ? dynamic(() => import("./permission-debug-global"), { ssr: false })
    : () => null;

interface ProvidersProps {
  children: React.ReactNode;
  session: Session | null;
  initialTheme: ThemeSchema | null;
}

export function Providers({
  children,
  session,
  initialTheme,
}: Readonly<ProvidersProps>) {
  const verifySession = useAuthStore((state) => state.verifySession);

  useEffect(() => {
    // Verify session on initial load
    if (typeof window !== "undefined") {
      verifySession().catch((error) => {
        console.error("Failed to verify session:", error);
      });
    }
  }, [verifySession]);

  return (
    <RootQueryProvider>
      <SessionProvider session={session}>
        <DomainProvider>
          <ThemeProvider initialTheme={initialTheme}>
            <PermissionProvider>
              <ChatBotProvider>
                <NextTopLoader
                  color="var(--color-on-header)"
                  showSpinner={false}
                  speed={300}
                  shadow="0 0 10px var(--color-on-header),0 0 5px var(--color-on-header)"
                  height={5}
                  zIndex={2147483647}
                />
                <SessionValidator />
                {children}
                {/* Add permission debug in development mode */}
                <PermissionDebug />
              </ChatBotProvider>
            </PermissionProvider>
          </ThemeProvider>
        </DomainProvider>
      </SessionProvider>
    </RootQueryProvider>
  );
}

function SessionValidator() {
  const { data: session, status } = useSession();
  const { setSession, markSessionChecked } = useAuthStore();
  const { setPermissions } = usePermissionStore();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (status === "authenticated" && session?.user) {
      setSession(session);

      const isCustomer = session.user.account_type === "customer";

      if (isCustomer) {
        // Customers have no roles/permissions; mark store as loaded with empty array
        // Do NOT write permission-storage to localStorage
        setPermissions([]);
      } else if (
        session.user.permissions !== undefined &&
        Array.isArray(session.user.permissions) &&
        session.user.permissions.length > 0
      ) {
        setPermissions(session.user.permissions);
        try {
          sessionStorage.setItem(
            "permissions-backup",
            JSON.stringify(session.user.permissions),
          );
          localStorage.setItem(
            "permission-storage",
            JSON.stringify({
              state: { permissions: session.user.permissions, isLoaded: true },
              version: 0,
            }),
          );
        } catch (e) {
          console.error("Error storing permissions:", e);
        }
      }
    } else if (status === "unauthenticated") {
      console.log("❌ SessionValidator: No session, clearing Zustand store");
      setSession(null);
    }

    markSessionChecked();
  }, [session, status, setSession, markSessionChecked, setPermissions]);

  return null; // This is a utility component with no UI
}
