"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRoles } from "../../manage-roles/_lib/queries";
import { Lock, ShieldAlert, AlertCircle, Loader2 } from "lucide-react";
import { PermissionItem, Role } from "../../manage-roles/_lib/types";
import { toast } from "sonner";

// Group permissions by category for UI display
interface PermissionGroup {
  title: string;
  permissions: PermissionItem[];
}

// Props for the permissions dialog
interface PermissionsDialogProps {
  roleId: number;
  initialPermissions?: { [key: string]: boolean };
  onPermissionsChange: (permissions: { [key: string]: boolean }) => void;
  triggerComponent: React.ReactNode;
}

const StaffPermissionsDialog = ({
  roleId,
  initialPermissions = {},
  onPermissionsChange,
  triggerComponent,
}: PermissionsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>(
    []
  );
  const [allToggled, setAllToggled] = useState(false);

  // Fetch roles data
  const { data: roles, isLoading } = useRoles();

  // Initialize permissions when dialog opens
  useEffect(() => {
    if (!open || !roles) return;

    // Find the role by ID
    const currentRole = roles.find((r) => r.id === roleId);
    if (currentRole) {
      // Transform to Role type from manage-roles
      const transformedRole: Role = {
        id: currentRole.id,
        title: currentRole.label,
        name: currentRole.slug,
        permissions: currentRole.permissions.map((perm) => ({
          id: perm.id,
          title: perm.label || perm.slug,
          slug: perm.slug,
          label: perm.label,
          key: perm.key || perm.slug,
        })),
        description: `${currentRole.label} role with custom permissions.`,
        slug: currentRole.slug,
        label: currentRole.label,
      };
      setRole(transformedRole);

      // Process permissions into groups
      const groups: { [key: string]: PermissionGroup } = {};

      if (currentRole.permissions) {
        // Initialize permissions state
        const permsState: { [key: string]: boolean } = {};

        currentRole.permissions.forEach((perm) => {
          // Handle different permission formats (old and new API)
          let permKey;
          let permTitle;
          let permId;

          if (typeof perm === "object") {
            permKey = perm.key || perm.slug;
            permTitle = perm.title || perm.label;
            permId = perm.id || 0;
          } else {
            // Old format: string slug
            permKey = perm;
            permTitle = perm;
            permId = 0;
          }

          // Set initial state - prioritize the initialPermissions from props
          // Default to false if not specified in initialPermissions
          permsState[permKey] = initialPermissions[permKey] ?? false;

          // Process permission item for display
          const permItem: PermissionItem = {
            id: permId,
            slug: permKey,
            key: permKey,
            label: permTitle,
            title: permTitle,
          };

          // Group by category (if available) or use "Permissions"
          const groupName = "Permissions";

          if (!groups[groupName]) {
            groups[groupName] = {
              title: groupName,
              permissions: [],
            };
          }

          groups[groupName].permissions.push(permItem);
        });

        setPermissions(permsState);
        setPermissionGroups(Object.values(groups));

        // Check if all permissions are enabled
        const allEnabled = Object.values(permsState).every(Boolean);
        setAllToggled(allEnabled);
      }
    }
  }, [open, roles, roleId, initialPermissions]);

  // Toggle all permissions
  const toggleAllPermissions = () => {
    const newValue = !allToggled;
    const updatedPermissions = { ...permissions };

    Object.keys(updatedPermissions).forEach((key) => {
      updatedPermissions[key] = newValue;
    });

    setPermissions(updatedPermissions);
    setAllToggled(newValue);
  };

  // Toggle individual permission
  const togglePermission = (slug: string) => {
    setPermissions((prev) => {
      const newState = {
        ...prev,
        [slug]: !prev[slug],
      };

      // Update allToggled state
      const allEnabled = Object.values(newState).every(Boolean);
      setAllToggled(allEnabled);

      return newState;
    });
  };

  // Save permissions
  const handleSave = () => {
    // Check if at least one permission is selected
    if (enabledCount === 0) {
      // Don't close dialog and don't save - no toast message as requested
      return;
    }

    onPermissionsChange(permissions);
    setOpen(false);
    toast.success("Permissions customized successfully");
  };

  // Count enabled permissions
  const enabledCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = Object.keys(permissions).length;

  // Check if validation error should be shown
  const showValidationError = enabledCount === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerComponent}</DialogTrigger>
      <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-[95vw] md:max-w-[600px] text-black">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--color-primary)] shrink-0" />
            <span className="truncate">
              Active Permissions{" "}
              {role && `for ${role.label || role.title} Role`}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Customize which actions this staff member can perform
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
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
                <span
                  className={`font-medium ${
                    showValidationError ? "text-red-500" : "text-foreground"
                  }`}
                >
                  {enabledCount}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {totalCount}
                </span>{" "}
                permissions enabled
                {showValidationError && (
                  <span className="ml-2 text-red-500">
                    At least one permission is required
                  </span>
                )}
              </div>
              <Button
                variant="event-outline"
                size="sm"
                className="h-7 text-xs"
                onClick={toggleAllPermissions}
              >
                {allToggled ? "Disable All" : "Enable All"}
              </Button>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-6">
                {permissionGroups.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <h3 className="text-sm font-medium border-b pb-1">
                      {group.title}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {group.permissions.map((permission) => {
                        // Ensure we have a valid key for permission
                        const permKey = permission.key || permission.slug || "";

                        return (
                          <div
                            key={permKey}
                            className="flex items-center space-x-2 py-1"
                          >
                            <Checkbox
                              id={`permission-${permKey}`}
                              checked={permissions[permKey] || false}
                              onCheckedChange={() => togglePermission(permKey)}
                            />
                            <div className="grid gap-0">
                              <label
                                htmlFor={`permission-${permKey}`}
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                {permission.label ||
                                  permission.title ||
                                  permKey}
                              </label>
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
            variant="event-outline"
            onClick={() => setOpen(false)}
            className="mr-2"
          >
            Cancel
          </Button>
          <Button
            variant="event-primary"
            type="button"
            onClick={handleSave}
            className="gap-1"
            disabled={!role || enabledCount === 0}
          >
            <Lock className="h-4 w-4" />
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StaffPermissionsDialog;
