import ManageRoles from "./_component/roles";
import { fetchRoles } from "./_lib/actions";
import { RolesSkeletonLoader } from "./_component/skeleton-loader";
import { Shell } from "@/components/shell";
import React from "react";
import { Role as ComponentRole } from "./_lib/types";

// This interface is no longer used directly
// import { Role } from "@/services/common/manage-roles/type";

export default async function Page() {
  // Fetch roles from the service
  const rolesFromService = await fetchRoles();

  // Transform service roles to component roles format
  const roles: Record<string, ComponentRole> = {};

  // Convert format if there are roles returned
  Object.entries(rolesFromService).forEach(([slug, role]) => {
    roles[slug] = {
      id: role.id,
      name: slug,
      title: role.label || slug,
      description: `${role.label || slug} role with custom permissions.`,
      permissions: Array.isArray(role.permissions)
        ? role.permissions.map((perm) => ({
            title: perm.label || perm.slug || "",
            slug: perm.slug || "",
          }))
        : [],
      slug: role.slug,
    };
  });

  return (
    <section className="page">
      <Shell className="gap-2">
        <React.Suspense fallback={<RolesSkeletonLoader />}>
          <section className="w-full relative">
            <ManageRoles roles={roles} />
          </section>
        </React.Suspense>
      </Shell>
    </section>
  );
}
