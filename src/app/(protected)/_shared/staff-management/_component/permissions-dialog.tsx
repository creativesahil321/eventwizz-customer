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
      <DialogContent className="!max-w-[calc(100%-0.5rem)] sm:!max-w-[90vw] md:!max-w-[480px] lg:!max-w-[500px] !h-[calc(100vh-1rem)] sm:!h-auto !max-h-[calc(100vh-2rem)] sm:!max-h-[82vh] md:!max-h-[78vh] overflow-hidden !flex !flex-col !gap-0 !p-3 sm:!p-3 md:!p-4 text-black !top-2 sm:!top-3 md:!top-[50%] !left-1/2 !-translate-x-1/2 !-translate-y-0 sm:!-translate-y-0 md:!-translate-y-1/2 [&>button]:!top-2 [&>button]:!right-2">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base pr-6">
            <ShieldAlert className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
            <span className="truncate">
              Active Permissions{" "}
              {role && `for ${role.label || role.title} Role`}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs"></DialogDescription>
          Customize which actions this staff member can perform
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center py-4 flex-shrink-0">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : role === null ? (
            <div className="flex flex-col items-center justify-center py-4 text-center flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-[var(--color-error)] mb-2" />
              <h3 className="font-medium text-base">No role selected</h3>
              <p className="text-muted-foreground text-sm">
                Select a role to view and customize permissions
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2 flex-shrink-0">
                <div className="text-xs text-muted-foreground">
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
                  enabled
                  {showValidationError && (
                    <span className="block sm:inline sm:ml-2 text-red-500 text-xs mt-0.5 sm:mt-0">
                      At least one required
                    </span>
                  )}
                </div>
                <Button
                  variant="event-outline"
                  size="sm"
                  className="h-7 text-xs w-full sm:w-auto px-3"
                  onClick={toggleAllPermissions}
                >
                  {allToggled ? "Disable All" : "Enable All"}
                </Button>
              </div>

              <ScrollArea className="flex-1 min-h-0 pr-2">
                <div className="space-y-3">
                  {permissionGroups.map((group) => (
                    <div key={group.title} className="space-y-1.5">
                      <h3 className="text-xs font-medium border-b pb-0.5">
                        {group.title}
                      </h3>
                      <div className="grid grid-cols-1 gap-1">
                        {group.permissions.map((permission) => {
                          // Ensure we have a valid key for permission
                          const permKey =
                            permission.key || permission.slug || "";

                          return (
                            <div
                              key={permKey}
                              className="flex items-center space-x-2 py-0.5"
                            >
                              <Checkbox
                                id={`permission-${permKey}`}
                                checked={permissions[permKey] || false}
                                onCheckedChange={() =>
                                  togglePermission(permKey)
                                }
                                className="shrink-0 h-4 w-4"
                              />
                              <div className="grid gap-0 min-w-0 flex-1">
                                <label
                                  htmlFor={`permission-${permKey}`}
                                  className="text-xs font-medium leading-tight cursor-pointer break-words"
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
        </div>

        <DialogFooter className="flex-shrink-0 mt-2 pt-2 border-t gap-2">
          <Button
            variant="event-outline"
            onClick={() => setOpen(false)}
            className="w-full sm:w-auto text-xs h-8 px-3"
          >
            Cancel
          </Button>
          <Button
            variant="event-primary"
            type="button"
            onClick={handleSave}
            className="gap-1 w-full sm:w-auto text-xs h-8 px-3"
            disabled={!role || enabledCount === 0}
          >
            <Lock className="h-3 w-3" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StaffPermissionsDialog;
