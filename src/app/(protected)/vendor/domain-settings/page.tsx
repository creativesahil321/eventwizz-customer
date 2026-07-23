"use client";

import React from "react";
import { Globe } from "lucide-react";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";
import { Shell } from "@/components/shell";
import { PermissionRoute } from "@/components/permission";
import { DomainTab } from "@/app/(protected)/_shared/sites-essentials/_components/tabs/domain-tab";

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
                <Globe className="w-5 h-5 text-primary shrink-0" />
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  Domain Settings
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5">
                Manage your domain, verify your business, and unlock all
                platform features.
              </p>
            </div>

            {/* Domain tab content */}
            <div className={pageCardClassName("min-w-0")}>
              <DomainTab />
            </div>
          </div>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
