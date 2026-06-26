"use client";

import React from "react";
import { Shell } from "@/components/shell";
import CreateRoleForm from "../../../_shared/manage-roles/_component/create-role-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "../../../_shared/manage-roles/_lib/queries";
import { BackButton } from "@/components/ui/back-button";

export default function CreateRolePage() {
  // Get all permissions
  const { data: permissions, isLoading, error } = usePermissions();

  // Loading state
  if (isLoading) {
    return (
      <section className="page bg-[var(--color-background,#f3f4f6)]">
        <Shell>
          {/* Page Header with Back Button */}
          <BackButton href="/admin/manage-roles" label="Back to Roles" />

          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-6 text-black">
            <h1 className="text-2xl title-header font-bold">Create New Role</h1>
            <p className="text-muted-foreground mt-2">
              Define a new role with custom permissions for your staff members.
            </p>
          </div>

          {/* Form Card - Loading State */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6">
            <div className="space-y-6">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-10 w-full" />
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full" />
                  ))}
                </div>
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </Shell>
      </section>
    );
  }

  // Error state
  if (error || !permissions) {
    return (
      <section className="page bg-[var(--color-background,#f3f4f6)]">
        <Shell>
          <div className="bg-white rounded-lg border border-red-300 shadow-md p-6">
            <h1 className="text-2xl font-bold text-red-600">Error</h1>
            <p className="mt-2">
              {error instanceof Error
                ? error.message
                : "Failed to load permissions"}
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="destructive"
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </Shell>
      </section>
    );
  }

  return (
    <section className="page bg-[var(--color-background,#f3f4f6)]">
      <Shell>
        {/* Page Header with Back Button */}
        <BackButton href="/admin/manage-roles" label="Back to Roles" />

        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-6 text-black">
          <h1 className="text-2xl title-header font-bold">Create New Role</h1>
          <p className="text-muted-foreground mt-2">
            Define a new role with custom permissions for your staff members.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6">
          <CreateRoleForm permissions={permissions} />
        </div>
      </Shell>
    </section>
  );
}
