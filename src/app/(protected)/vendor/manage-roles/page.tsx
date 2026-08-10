import { Shell } from "@/components/shell";
import React from "react";
import ManageRoles from "../../_shared/manage-roles/_component/roles";
import { RolesSkeletonLoader } from "../../_shared/manage-roles/_component/skeleton-loader";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { PermissionGuard } from "@/components/permission/PermissionGuard";
import { PermissionRoute } from "@/components/permission";
import { AllLocationsBadge } from "@/components/location-indicator";

export default function Page() {
  return (
    <PermissionRoute
      permissionKey="read-role-permission"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page bg-[var(--color-background,#f3f4f6)]">
        <Shell>
        <React.Suspense fallback={<RolesSkeletonLoader />}>
          <section className="w-full relative">
            <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-6 text-black">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="min-w-0 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl title-header font-bold">
                    Manage Roles & Permissions
                  </h1>
                  <AllLocationsBadge />
                </div>
                <PermissionGuard permissionKey="create-role-permission">
                  <Link href="./manage-roles/create" className="shrink-0">
                    <Button
                      variant="event-primary"
                      className="flex items-center gap-1"
                    >
                      <PlusCircle className="h-4 w-4 mr-1" /> Create Role
                    </Button>
                  </Link>
                </PermissionGuard>
              </div>
              <p className="text-muted-foreground mt-2">
                Manage staff roles and permissions across every venue. Each role
                can have custom permissions to match your organisation&apos;s
                needs.
              </p>
            </div>

            <ManageRoles roles={{}} />
          </section>
        </React.Suspense>
      </Shell>
    </section>
    </PermissionRoute>
  );
}
