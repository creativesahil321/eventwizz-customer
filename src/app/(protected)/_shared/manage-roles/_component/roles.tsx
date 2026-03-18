"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  AlertCircle,
  Trash2,
} from "lucide-react";
import PermissionsDialog from "./_update-permissions";
import { Role } from "../_lib/types";
import { Badge } from "@/components/ui/badge";
import {
  useRoles,
  usePermissions,
  useUpdateRole,
  useDeleteRole,
} from "../_lib/queries";
import { RolesLoadingSkeleton } from "./skeleton-loader";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AxiosError } from "axios";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PermissionGuard } from "@/components/permission/PermissionGuard";

interface ManageRolesProps {
  roles: Record<string, Role>;
}

const RoleIcons: Record<string, React.ReactNode> = {
  admin: <ShieldAlert className="h-6 w-6 text-[var(--color-primary)]" />,
  manager: <ShieldCheck className="h-6 w-6 text-[var(--color-primary)]" />,
  "dealing-department": (
    <Shield className="h-6 w-6 text-[var(--color-primary)]" />
  ),
  support: <ShieldQuestion className="h-6 w-6 text-[var(--color-primary)]" />,
};

// Error display component
function RolesError({ message }: { readonly message: string }) {
  return (
    <div className="w-full p-6 border border-red-200 rounded-lg bg-red-50">
      <div className="flex items-center gap-2 text-red-600 mb-2">
        <AlertCircle className="h-5 w-5" />
        <h3 className="font-semibold">Unable to load roles</h3>
      </div>
      <p className="text-red-700 mb-4">{message}</p>
    </div>
  );
}

export default function ManageRoles({
  roles: initialRoles,
}: Readonly<ManageRolesProps>) {
  // Delete role state
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch roles from API
  const {
    data: rolesData,
    isLoading: rolesLoading,
    error: rolesError,
  } = useRoles();

  // Fetch permissions to ensure they're available for the permissions dialog
  const { isLoading: permissionsLoading } = usePermissions();

  // Add the update role mutation hook
  const updateRoleMutation = useUpdateRole();

  // Add the delete role mutation hook
  const deleteRoleMutation = useDeleteRole();

  // Using combined loading state
  const isLoading = rolesLoading || permissionsLoading;

  // Convert API roles format to component format
  const transformRoles = () => {
    if (!rolesData) return initialRoles;

    const transformedRoles: Record<string, Role> = {};

    rolesData.forEach((role) => {
      if (!role) return;

      transformedRoles[role.slug] = {
        id: role.id,
        name: role.slug,
        title: role.label,
        is_default: role.is_default,
        permissions: Array.isArray(role.permissions)
          ? role.permissions.map((perm) => ({
              title: perm.label,
              slug: perm.slug,
            }))
          : [],
        description: `${role.label} role with custom permissions.`,
      };
    });

    return transformedRoles;
  };

  // Handler for updating permissions
  const handleUpdatePermissions = (
    roleId: string | number,
    permissionState: { [key: string]: boolean },
    roleData: { label: string }
  ) => {
    try {
      // Get the current role data from our transformed roles
      const currentRole = roleValues.find((role) => role.id === Number(roleId));

      if (!currentRole) {
        console.error("Role not found:", roleId);
        toast.error("Failed to update permissions: Role not found");
        return;
      }

      // Extract enabled permissions (only the permission IDs that are set to true)
      const enabledPermissionIds = Object.entries(permissionState)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_, enabled]) => enabled)
        .map(([permSlug]) => {
          // Try to parse the permission slug as a number
          const permId = Number.parseInt(permSlug, 10);
          return Number.isNaN(permId) ? permSlug : permId;
        })
        .filter((id) => typeof id === "number"); // Only keep numeric IDs

      const roleLabel = roleData.label;

      updateRoleMutation.mutate(
        {
          id: Number(roleId),
          permissions: enabledPermissionIds,
          label: roleLabel,
        },
        {
          onSuccess: (response) => {
            if (!response.status) {
              console.error("API error:", response.errors || response.message);
            }
          },
          onError: (error: unknown) => {
            console.error("Permission update error:", error);
            if (error instanceof AxiosError) {
              console.error("Response data:", error.response?.data);
              console.error("Response status:", error.response?.status);
            }
          },
        }
      );
    } catch (error) {
      console.error("Error preparing permission update:", error);
    }
  };

  // Handler for deleting a role
  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
    setIsDeleteDialogOpen(true);
  };

  // Confirm role deletion
  const confirmDeleteRole = () => {
    if (!roleToDelete) return;

    deleteRoleMutation.mutate(roleToDelete.id, {
      onSuccess: (response) => {
        if (!response.status) {
          console.error("API error:", response.errors || response.message);
        }
        setIsDeleteDialogOpen(false);
        setRoleToDelete(null);
      },
      onError: (error: unknown) => {
        console.error("Role deletion error:", error);
        if (error instanceof AxiosError) {
          console.error("Response data:", error.response?.data);
          console.error("Response status:", error.response?.status);
        }
        setIsDeleteDialogOpen(false);
        setRoleToDelete(null);
      },
    });
  };

  // Get roles from either API or initial props
  const roles = transformRoles();
  const roleValues = Object.values(roles || {});

  if (isLoading) {
    return <RolesLoadingSkeleton />;
  }

  if (rolesError) {
    return (
      <RolesError message="Failed to load roles. Please try again later." />
    );
  }

  if (!roleValues.length) {
    return (
      <div className="text-center p-8 border rounded-lg bg-gray-50">
        <ShieldQuestion className="h-12 w-12 mx-auto text-gray-400 mb-3" />
        <h3 className="text-lg font-medium mb-2">No roles found</h3>
        <p className="text-gray-500 mb-4">
          Click the &ldquo;Create Role&rdquo; button to add your first role
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {roleValues.map((role) => (
          <Card
            key={role.id}
            className="shadow-sm border border-[var(--color-border)] hover:shadow-md transition-all duration-300 bg-white overflow-hidden"
          >
            <CardHeader className="pb-2 min-w-0">
              <div className="flex justify-between items-start gap-2 min-w-0">
                <CardTitle className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                  {RoleIcons[role.name] || (
                    <Shield className="h-6 w-6 text-[var(--color-primary)] flex-shrink-0" />
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-lg font-semibold truncate min-w-0 cursor-default">
                        {role.title}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[min(320px,90vw)]">
                      {role.title}
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <Badge
                  variant="outline"
                  className="border border-input bg-gray-100 text-gray-800 text-xs flex-shrink-0 whitespace-nowrap dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                >
                  {role.permissions.length} permissions
                </Badge>
              </div>
              <CardDescription
                className="mt-2 text-muted-foreground line-clamp-2 break-words overflow-hidden text-ellipsis"
                title={role.description}
              >
                {role.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex flex-wrap gap-2 mb-4">
                {role.permissions.slice(0, 3).map((permission) => {
                  const permTitle = permission.title || "Permission";
                  return (
                    <Tooltip key={permission.id || permission.slug}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className="bg-gray-100 text-gray-800 text-xs max-w-[160px] truncate cursor-default dark:bg-gray-700 dark:text-gray-100"
                        >
                          {permTitle}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[min(320px,90vw)]">
                        {permTitle}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {role.permissions.length > 3 && (
                  <Badge
                    variant="secondary"
                    className="bg-gray-100 text-gray-800 text-xs dark:bg-gray-700 dark:text-gray-100"
                  >
                    +{role.permissions.length - 3} more
                  </Badge>
                )}
              </div>

              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <PermissionGuard permissionKey="update-role-permission">
                    <PermissionsDialog
                      title={role.title}
                      roleId={role.id}
                      isDefault={role.is_default}
                      permissions={[
                        {
                          title: "Role Permissions",
                          slug: "role-permissions",
                          permission: role.permissions.map((perm) => ({
                            id: perm.id,
                            slug: perm.slug,
                            label:
                              perm.title ||
                              perm.slug.split(".").pop() ||
                              perm.slug,
                            title: perm.title,
                            key: perm.key || perm.slug,
                            permission: [],
                          })),
                        },
                      ]}
                      onSave={handleUpdatePermissions}
                    />
                  </PermissionGuard>
                </div>

                {!role.is_default && (
                  <PermissionGuard permissionKey="delete-role-permission">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50 border-[var(--color-border)]"
                      onClick={() => handleDeleteRole(role)}
                      aria-label="Delete role"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Role Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the role &ldquo;{roleToDelete?.title}
              &rdquo;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRole}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
