"use client";

import React from "react";
import { Shell } from "@/components/shell";
import { PermissionRoute } from "@/components/permission";
import { ProtectedPageHeader } from "@/app/(protected)/_components/page-header-card";
import { PlatformCommissionDefaults } from "./_components/platform-commission-defaults";
import { AiProvidersCard } from "./_components/ai-providers-card";

export default function AdminSettingsPage() {
  return (
    <PermissionRoute
      permissionKey="read-account"
      fallbackPath="/admin/dashboard"
    >
      <section className="page min-w-0 pb-20 text-black sm:pb-24">
        <Shell className="gap-4">
          <ProtectedPageHeader
            title="Settings"
            description="Manage platform-wide defaults used across EventWizz."
          />
          <PlatformCommissionDefaults />
          <AiProvidersCard />
        </Shell>
      </section>
    </PermissionRoute>
  );
}
