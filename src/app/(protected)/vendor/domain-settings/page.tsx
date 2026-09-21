"use client";

import React from "react";
import { Building2 } from "lucide-react";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";
import { Shell } from "@/components/shell";
import { PermissionRoute } from "@/components/permission";
import { DomainTab } from "@/app/(protected)/_shared/sites-essentials/_components/tabs/domain-tab";
import { LocationScopedTitle } from "@/components/location-indicator";

export default function DomainSettingsPage() {
  return (
    <PermissionRoute
      permissionKey="read-account"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page text-black min-w-0 pb-20 sm:pb-24">
        <Shell className="gap-4">
          <div className="flex flex-col gap-4 min-w-0">
            {/* Page header */}
            <div className={pageCardClassName("min-w-0")}>
              <div className="flex items-center gap-2.5 title-header">
                <Building2 className="w-5 h-5 text-primary shrink-0" />
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  <LocationScopedTitle title="Business Settings" />
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5">
                Verify this venue&apos;s business details. Switch location in
                the header to manage another venue.
              </p>
            </div>

            {/* Business verification */}
            <div className={pageCardClassName("min-w-0")}>
              <DomainTab />
            </div>
          </div>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
