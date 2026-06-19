import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, ShieldAlert, AlertCircle, Loader2 } from "lucide-react";
import { useRoles } from "../../manage-roles/_lib/queries";
import { Role, Permission } from "../../manage-roles/_lib/types";
import { Role as ApiRole } from "@/services/common/manage-roles/type";

// Group permissions by category
interface PermissionGroup {
  label: string;
  permissions: Permission[];
}

interface StaffPermissionsDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly roleId?: number;
  readonly roleName?: string; // Optional role name/slug
  readonly customPermissions?: { [key: string]: boolean };
  readonly hasCustomizedPermissions?: boolean;
  readonly onPermissionsChange: (permissions: {
    [key: string]: boolean;
  }) => void;
  readonly onToggleCustomize: (customized: boolean) => void;
}

export function StaffPermissionsDialog({
  open,
  onOpenChange,
  roleId = 0,
  roleName,
  customPermissions = {},
  hasCustomizedPermissions = false,
  onPermissionsChange,
  onToggleCustomize,
}: StaffPermissionsDialogProps) {
  const [permissions, setPermissions] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [role, setRole] = useState<Role | null>(null);
  const [allToggled, setAllToggled] = useState(true);

  // Fetch roles data
  const { data: roleData, isLoading: rolesLoading } = useRoles();

  // Count active permissions
  const activePermissionsCount =
    Object.values(permissions).filter(Boolean).length;
  const totalPermissionsCount = Object.keys(permissions).length;

  // Handle role changes
  useEffect(() => {
    if (!open || !roleData || roleData.length === 0) return;

    // Transform API role to component Role type
    const transformApiRole = (apiRole: ApiRole): Role => {
      return {
        id: apiRole.id,
        title: apiRole.label,
        name: apiRole.slug,
        permissions: apiRole.permissions.map((perm) => ({
          id: perm.id,
          title: perm.title || perm.label || perm.slug,
          slug: perm.slug,
          label: perm.label || perm.title || perm.slug,
          key: perm.key || perm.slug,
        })),
        description: `${apiRole.label} role with custom permissions.`,
        slug: apiRole.slug,
        label: apiRole.label,
      };
    };

    if (roleId > 0) {
      // Find the role by ID
      const foundRole = roleData.find((r) => r.id === roleId);
      if (foundRole) {
        const transformedRole = transformApiRole(foundRole);
        setRole(transformedRole);
        if (transformedRole.permissions) {
          // Initialize permissions with the role's permissions
          const initialPermissions: { [key: string]: boolean } = {};
          if (hasCustomizedPermissions && customPermissions) {
            // When customized, use the custom permissions
            transformedRole.permissions.forEach((permission) => {
              initialPermissions[permission.slug] = Boolean(
                customPermissions[permission.slug]
              );
            });
          } else {
            // Otherwise use the default permissions
            transformedRole.permissions.forEach((permission) => {
              initialPermissions[permission.slug] = true;
            });
          }
          setPermissions(initialPermissions);
        }
      }
    } else if (roleName) {
      // If we have a role name/slug but not ID, find the role
      const foundRole = roleData.find(
        (r) =>
          r.slug === roleName ||
          r.label.toLowerCase() === roleName.toLowerCase()
      );
      if (foundRole) {
        const transformedRole = transformApiRole(foundRole);
        setRole(transformedRole);
        if (transformedRole.permissions) {
          // Initialize permissions with the role's permissions
          const initialPermissions: { [key: string]: boolean } = {};
          if (hasCustomizedPermissions && customPermissions) {
            // When customized, use the custom permissions
            transformedRole.permissions.forEach((permission) => {
              initialPermissions[permission.slug] = Boolean(
                customPermissions[permission.slug]
              );
            });
          } else {
            // Otherwise use the default permissions
            transformedRole.permissions.forEach((permission) => {
              initialPermissions[permission.slug] = true;
            });
          }
          setPermissions(initialPermissions);
        }
      }
    }
  }, [
    open,
    roleId,
    roleName,
    roleData,
    hasCustomizedPermissions,
    customPermissions,
  ]);

  // Check if all permissions are toggled
  useEffect(() => {
    const allActive = Object.values(permissions).every(Boolean);
    setAllToggled(allActive);
  }, [permissions]);

  // Save permissions when dialog is closed
  const handleSave = () => {
    onPermissionsChange(permissions);
    onOpenChange(false);
  };

  // Toggle all permissions
  const toggleAllPermissions = () => {
    const newAllToggled = !allToggled;
    const newPermissions = { ...permissions };

    Object.keys(newPermissions).forEach((key) => {
      newPermissions[key] = newAllToggled;
    });

    setPermissions(newPermissions);
    setAllToggled(newAllToggled);
    onToggleCustomize(true);
  };

  // Toggle a single permission
  const togglePermission = (slug: string) => {
    const newPermissions = {
      ...permissions,
      [slug]: !permissions[slug],
    };
    setPermissions(newPermissions);
    onToggleCustomize(true);
  };

  // Group permissions by category (default to "Permissions" if no category)
  const groupedPermissions =
    role?.permissions?.reduce((groups: PermissionGroup[], permission) => {
      // Use a default group name since Permission type doesn't have a group property
      const groupLabel = "Permissions";
      const group = groups.find((g) => g.label === groupLabel);

      if (group) {
        group.permissions.push(permission);
      } else {
        groups.push({
          label: groupLabel,
          permissions: [permission],
        });
      }

      return groups;
    }, []) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-[95vw] md:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--color-primary)] shrink-0" />
            <span className="truncate">
              Active Permissions{" "}
              {role && `for ${role.label || role.title} Role`}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {hasCustomizedPermissions
              ? "These permissions have been customized. You can adjust which actions this staff member can perform."
              : "These are the default permissions for this role. You can customize them for this staff member."}
          </DialogDescription>
        </DialogHeader>

        {rolesLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : role === null ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-8 w-8 text-[var(--color-error)] mb-2" />
            <h3 className="font-medium text-lg">No role selected</h3>
            <p className="text-muted-foreground">
              Select a role to view and customize permissions
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {activePermissionsCount}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {totalPermissionsCount}
                </span>{" "}
                permissions enabled
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={toggleAllPermissions}
              >
                {allToggled ? "Disable All" : "Enable All"}
              </Button>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-6">
                {groupedPermissions.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <h3 className="text-sm font-medium border-b pb-1">
                      {group.label}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {group.permissions.map((permission) => {
                        const permissionKey = permission.id || permission.slug;
                        return (
                          <div
                            key={permissionKey}
                            className="flex items-center space-x-2 py-1"
                          >
                            <Checkbox
                              id={`permission-${permissionKey}`}
                              checked={permissions[permission.slug] || false}
                              onCheckedChange={() =>
                                togglePermission(permission.slug)
                              }
                            />
                            <div className="grid gap-0">
                              <label
                                htmlFor={`permission-${permissionKey}`}
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                {permission.title ||
                                  permission.label ||
                                  permission.slug}
                              </label>
                              {permission.label &&
                                permission.label !== permission.title && (
                                  <p className="text-xs text-muted-foreground">
                                    {permission.label}
                                  </p>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="gap-1"
            disabled={!role}
          >
            <Lock className="h-4 w-4" />
            {hasCustomizedPermissions
              ? "Update Permissions"
              : "Save Permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
