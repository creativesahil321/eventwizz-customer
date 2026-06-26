import React from "react";
import { Shell } from "@/components/shell";
import CreateRoleForm from "../_component/create-role-form";
import { fetchPermissions } from "../_lib/actions";

export default async function CreateRolePage() {
  const permissions = await fetchPermissions();

  return (
    <section className="page">
      <Shell className="gap-4 max-w-4xl">
        <h1 className="text-2xl font-bold">Create New Role</h1>
        <p className="text-muted-foreground">
          Define a new role with custom permissions for your staff members.
        </p>

        <CreateRoleForm permissions={permissions} />
      </Shell>
    </section>
  );
}
