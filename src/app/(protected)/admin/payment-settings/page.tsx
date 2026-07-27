"use client";

import React from "react";
import { Shell } from "@/components/shell";
import { PermissionRoute } from "@/components/permission";
import { PlatformCommissionDefaults } from "./_components/platform-commission-defaults";

export default function AdminPaymentSettingsPage() {
  return (
    <PermissionRoute
      permissionKey="read-account"
      fallbackPath="/admin/dashboard"
    >
      <section className="page text-black min-w-0 pb-20 sm:pb-24">
        <Shell className="gap-4">
          <div className="flex flex-col gap-4 min-w-0">
            <header className="flex w-full items-center justify-between gap-2 overflow-auto bg-white border border-[var(--color-border)] shadow-md rounded-lg p-4 sm:p-6 mb-4 min-w-0">
              <nav className="flex flex-col justify-start items-start gap-2 relative">
                <h1 className="text-2xl mb-0 title-header font-bold text-black">
                  Payment Settings
                </h1>
                <p className="text-muted-foreground">
                  Configure default platform commission applied when a venue has
                  not set a custom rate.
                </p>
              </nav>
            </header>

            <PlatformCommissionDefaults />
          </div>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
