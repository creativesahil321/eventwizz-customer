"use client";

import React from "react";
import { Shell } from "@/components/shell";
import EditStaffForm from "@/app/(protected)/_shared/staff-management/_component/edit-staff-form";
import { useParams } from "next/navigation";
import { PermissionRoute } from "@/components/permission/PermissionRoute";
import { BackButton } from "@/components/ui/back-button";

export default function EditStaffPage() {
  // Get ID from URL params using client-side hooks
  const params = useParams();
  const staffId = params.id ? parseInt(params.id as string) : 0;

  return (
    // Protect edit page with permission check
    <PermissionRoute
      permissionKey="update-staff"
      fallbackPath="/admin/staff-management"
    >
      <Shell>
        <div className="mb-10">
          <BackButton
            href="/admin/staff-management"
            label="Back to Staff Management"
          />

          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-6">
            <h1 className="text-2xl title-header font-bold mb-2">
              Edit Staff Member
            </h1>
            <p className="text-muted-foreground">
              Edit a staff member account and assign appropriate roles and
              permissions.
            </p>
          </div>
          <EditStaffForm staffId={staffId} hideLocationSelection />
        </div>
      </Shell>
    </PermissionRoute>
  );
}
