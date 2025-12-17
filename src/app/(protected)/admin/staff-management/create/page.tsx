import { Shell } from "@/components/shell";
import CreateStaffForm from "../../../_shared/staff-management/_component/create-staff-form";
import { PermissionRoute } from "@/components/permission/PermissionRoute";
import { BackButton } from "@/components/ui/back-button";

export default function CreateStaffPage() {
  return (
    <PermissionRoute
      permissionKey="create-staff"
      fallbackPath="/admin/staff-management"
    >
      <section className="page bg-[var(--color-background,#f3f4f6)]">
        <Shell>
          <BackButton
            href="/admin/staff-management"
            label="Back to Staff Management"
          />

          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-6">
            <h1 className="text-2xl title-header font-bold mb-2">
              Add New Staff
            </h1>
            <p className="text-muted-foreground">
              Create a new staff member account and assign appropriate roles and
              permissions.
            </p>
          </div>

          <CreateStaffForm />
        </Shell>
      </section>
    </PermissionRoute>
  );
}
