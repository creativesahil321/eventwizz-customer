import { Shell } from "@/components/shell";
import React from "react";
import StaffManagement from "../../_shared/staff-management/_component/staff";
import { StaffSkeletonLoader } from "../../_shared/staff-management/_component/skeleton-loader";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { PermissionGuard } from "@/components/permission/PermissionGuard";
import { PermissionRoute } from "@/components/permission/PermissionRoute";
import { AllLocationsBadge } from "@/components/location-indicator";

export default function Page() {
  return (
    // Wrap the entire page with PermissionRoute for read-staff permission
    <PermissionRoute
      permissionKey="read-staff"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page bg-[var(--color-background,#f3f4f6)]">
        <Shell>
          <React.Suspense fallback={<StaffSkeletonLoader />}>
            <section className="w-full relative">
              <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-6 text-black">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className="min-w-0 flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl title-header font-bold">
                      Staff Management
                    </h1>
                    <AllLocationsBadge />
                  </div>

                  {/* Hide Add Staff button if user doesn't have create-staff permission */}
                  <PermissionGuard permissionKey="create-staff">
                    <Link href="./staff-management/create" className="shrink-0">
                      <Button
                        variant="event-primary"
                        className="flex items-center gap-1"
                      >
                        <PlusCircle className="h-4 w-4 mr-1" /> Add Staff
                      </Button>
                    </Link>
                  </PermissionGuard>
                </div>
                <p className="text-muted-foreground mt-2">
                  Manage staff across every venue and assign roles to control
                  access. Each staff member can have specific roles with
                  customized permissions.
                </p>
              </div>

              <StaffManagement />
            </section>
          </React.Suspense>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
