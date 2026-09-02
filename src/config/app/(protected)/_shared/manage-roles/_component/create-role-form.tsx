"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, UserCog, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  PermissionGroup,
  Permission,
} from "@/services/common/manage-roles/type";
import { useCreateRole } from "../_lib/queries";
import { Separator } from "@/components/ui/separator";
import { createRoleSchema, CreateRoleFormValues } from "../_lib/schemas";

// Custom type for processed permission groups
interface ProcessedPermission {
  id?: number;
  slug: string;
  label: string;
}

interface ProcessedPermissionGroup {
  title: string;
  slug: string;
  permissions: ProcessedPermission[];
}

export default function CreateRoleForm({
  permissions,
}: {
  permissions: PermissionGroup[];
}) {
  const [isPermissionsEmpty, setIsPermissionsEmpty] = useState(false);
  const [isAllChecked, setIsAllChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname() || "";

  // Get the return path (parent directory)
  const returnPath = pathname.split("/").slice(0, -1).join("/");

  // Use the mutation hook for creating roles
  const createRoleMutation = useCreateRole();

  // Transform permissions data for display
  const [displayPermissions, setDisplayPermissions] = useState<
    ProcessedPermissionGroup[]
  >([]);

  // Process permissions data for display
  useEffect(() => {
    if (!permissions || permissions.length === 0) {
      setIsPermissionsEmpty(true);
      return;
    }

    setIsPermissionsEmpty(false);

    // Transform the API permissions data into the format we need
    const transformedGroups: ProcessedPermissionGroup[] = [];

    // Process all permissions from API
    permissions.forEach((group) => {
      const permissionItems = group.permission
        .filter((perm: Permission) => perm.id) // Ensure we only include permissions with IDs
        .map((perm: Permission) => ({
          id: perm.id,
          slug: perm.key || perm.slug,
          label: perm.title || perm.label,
        }));

      if (permissionItems.length > 0) {
        transformedGroups.push({
          title: group.title,
          slug: group.title.toLowerCase().replace(/\s+/g, "-"),
          permissions: permissionItems,
        });
      }
    });

    setDisplayPermissions(transformedGroups);
  }, [permissions]);

  const form = useForm<CreateRoleFormValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      label: "",
      permissions: [],
    },
  });

  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(values: CreateRoleFormValues) {
    try {
      if (isPermissionsEmpty) {
        setFormError("No permissions available to select");
        return;
      }

      createRoleMutation.mutate(values, {
        onSuccess: (result) => {
          if (result.status) {
            router.push(returnPath);
            router.refresh();
          } else {
            setFormError(result.message || "Failed to create role");
          }
        },
        onError: (error: Error) => {
          setFormError(error?.message || "Failed to create role");
        },
      });
    } catch (error) {
      setFormError("An error occurred while creating the role");
      console.error(error);
    }
  }

  // Watch permissions for UI updates
  const selectedPermissions = form.watch("permissions");

  // Collect all valid permission IDs from all permission groups
  const getAllPermissionIds = () => {
    if (displayPermissions.length === 0) return [];
    return displayPermissions.flatMap((group) =>
      group.permissions
        .filter((perm) => perm.id !== undefined)
        .map((perm) => perm.id!)
    );
  };

  const allPermissionIds = getAllPermissionIds();

  const getPermKey = (perm: ProcessedPermission) =>
    perm.id !== undefined ? perm.id : perm.slug;

  const isWriteAction = (perm: ProcessedPermission) => {
    const s = (perm.slug || perm.label || "").toLowerCase();
    if (s.includes("read")) return false;
    return (
      s.includes("create") ||
      s.includes("delete") ||
      s.includes("edit") ||
      s.includes("update") ||
      s.includes("resend") ||
      s.includes("send")
    );
  };

  const isReadPermission = (perm: ProcessedPermission) =>
    (perm.slug || perm.label || "").toLowerCase().includes("read");

  const findReadPermissionInGroup = (group: ProcessedPermissionGroup) =>
    group.permissions.find((p) => isReadPermission(p));

  const hasWriteEnabledInGroup = (
    group: ProcessedPermissionGroup,
    selectedIds: number[]
  ) =>
    group.permissions.some(
      (p) =>
        p.id !== undefined &&
        isWriteAction(p) &&
        selectedIds.includes(getPermKey(p) as number)
    );

  const normalizeSlug = (s: string | undefined) =>
    (s ?? "").toLowerCase().trim();

  const STAFF_ACTION_SLUGS = new Set([
    "read-staff",
    "create-staff",
    "update-staff",
    "delete-staff",
    "change-staff-status",
  ]);

  const isStaffManagementPermission = (perm: ProcessedPermission) => {
    const slug = normalizeSlug(perm.slug);
    if (!slug) return false;
    if (STAFF_ACTION_SLUGS.has(slug)) return true;
    return (
      slug.includes("staff") &&
      (slug.includes("read") ||
        slug.includes("create") ||
        slug.includes("update") ||
        slug.includes("delete") ||
        slug.includes("change"))
    );
  };

  const findPermissionById = (
    permissionId: number,
  ): ProcessedPermission | undefined => {
    for (const group of displayPermissions) {
      const p = group.permissions.find((x) => x.id === permissionId);
      if (p) return p;
    }
    return undefined;
  };

  const findReadRolePermission = (): ProcessedPermission | undefined => {
    for (const group of displayPermissions) {
      for (const p of group.permissions) {
        const slug = normalizeSlug(p.slug);
        if (
          slug === "read-role-permission" ||
          (slug.includes("read") &&
            slug.includes("role") &&
            slug.includes("permission"))
        ) {
          return p;
        }
      }
    }
    return undefined;
  };

  const isReadRolePermission = (perm: ProcessedPermission) => {
    const slug = normalizeSlug(perm.slug);
    return (
      slug === "read-role-permission" ||
      (slug.includes("read") &&
        slug.includes("role") &&
        slug.includes("permission"))
    );
  };

  const isStaffManagementEnabled = (selectedIds: number[]) => {
    for (const group of displayPermissions) {
      for (const p of group.permissions) {
        if (p.id === undefined || !isStaffManagementPermission(p)) continue;
        if (selectedIds.includes(p.id)) return true;
      }
    }
    return false;
  };

  // Update the "all checked" state
  useEffect(() => {
    const allEnabled =
      allPermissionIds.length > 0 &&
      allPermissionIds.every((id) => selectedPermissions.includes(id));
    setIsAllChecked(allEnabled);
  }, [selectedPermissions, allPermissionIds]);

  const updatePermissionSelections = (
    permissionId: number,
    isChecked: boolean
  ) => {
    const currentPermissions = form.getValues("permissions");
    let updatedPermissions: number[];

    if (isChecked) {
      updatedPermissions = currentPermissions.includes(permissionId)
        ? currentPermissions
        : [...currentPermissions, permissionId];

      const toggledPerm = findPermissionById(permissionId);
      if (toggledPerm && isStaffManagementPermission(toggledPerm)) {
        const readRole = findReadRolePermission();
        if (
          readRole?.id !== undefined &&
          !updatedPermissions.includes(readRole.id)
        ) {
          updatedPermissions = [...updatedPermissions, readRole.id];
        }
      }

      // If a write permission is enabled, ensure read in same group is enabled.
      for (const group of displayPermissions) {
        const perm = group.permissions.find(
          (p) => p.id !== undefined && p.id === permissionId
        );
        if (!perm || !isWriteAction(perm)) continue;

        const readPerm = findReadPermissionInGroup(group);
        if (
          readPerm?.id !== undefined &&
          !updatedPermissions.includes(readPerm.id)
        ) {
          updatedPermissions = [...updatedPermissions, readPerm.id];
        }
        break;
      }
    } else {
      const toggledPerm = findPermissionById(permissionId);
      if (toggledPerm && isReadRolePermission(toggledPerm)) {
        if (isStaffManagementEnabled(currentPermissions)) {
          return;
        }
      }

      // If trying to disable READ while write exists in same group, block it.
      for (const group of displayPermissions) {
        const perm = group.permissions.find(
          (p) => p.id !== undefined && p.id === permissionId
        );
        if (!perm || !isReadPermission(perm)) continue;

        if (hasWriteEnabledInGroup(group, currentPermissions)) {
          return;
        }
        break;
      }

      updatedPermissions = currentPermissions.filter(
        (id) => id !== permissionId
      );
    }

    form.setValue("permissions", updatedPermissions, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const toggleAllPermissions = (checked: boolean) => {
    const allPermissionIds: number[] = [];

    if (checked) {
      // Add all permission IDs when "Toggle All" is checked
      displayPermissions.forEach((group) => {
        group.permissions.forEach((perm) => {
          if (perm.id) {
            allPermissionIds.push(perm.id);
          }
        });
      });
    }

    form.setValue("permissions", allPermissionIds, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setIsAllChecked(checked);
  };

  // Count selected permissions
  const getSelectionCount = () => {
    return form.getValues("permissions").length;
  };

  // Check if everything is loaded properly
  const isLoading = createRoleMutation.isPending;

  if (isPermissionsEmpty) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-200">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertCircle className="h-5 w-5" />
          <h3 className="font-semibold">Unable to load permissions</h3>
        </div>
        <p className="text-red-700 mb-4">
          We couldn&apos;t retrieve the permission data needed to create a role.
          This might be a temporary issue.
        </p>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(returnPath)}
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-24 bg-gray-100 rounded-md"></div>
          <div className="h-24 bg-gray-100 rounded-md"></div>
        </div>
        <div className="space-y-4">
          <div className="h-6 bg-gray-100 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            <AlertCircle className="h-4 w-4 inline-block mr-1" />
            {formError}
          </div>
        )}

        <div className="space-y-2">
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-sm font-semibold">
                  Role Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="E.g., Marketing Manager"
                    {...field}
                    maxLength={50}
                    onChange={(e) => {
                      const raw = e.target.value.slice(0, 50);
                      const value = raw.replace(/[^a-zA-Z0-9\s\-']/g, "");
                      e.target.value = value;
                      field.onChange(value);
                    }}
                    className="h-10"
                  />
                </FormControl>
                <div className="flex items-center justify-between">
                  <FormDescription className="text-xs text-black/50">
                    Letters, numbers, spaces, hyphens and apostrophes only.
                  </FormDescription>
                  <span className="text-xs text-muted-foreground">
                    {field.value?.length || 0}/50
                  </span>
                </div>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">Permissions</h3>
              {getSelectionCount() > 0 && (
                <Badge className="bg-[var(--color-primary)] text-white">
                  {getSelectionCount()} enabled
                </Badge>
              )}
            </div>

            <div className="flex items-center">
              <FormLabel htmlFor="toggle-all" className="mr-2 text-sm">
                Toggle All Permissions
              </FormLabel>
              <Switch
                id="toggle-all"
                checked={isAllChecked}
                onCheckedChange={toggleAllPermissions}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayPermissions.map((group) => (
              <div
                key={group.slug}
                className="border border-[var(--color-border)] p-4 rounded-lg shadow-sm bg-background"
              >
                <div className="flex items-center mb-2">
                  <UserCog className="h-5 w-5 text-[var(--color-primary)] mr-2" />
                  <h3 className="font-semibold text-lg">{group.title}</h3>
                </div>
                <Separator className="mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                  {group.permissions.map((perm) => {
                    if (perm.id === undefined) return null;
                    const isRead = isReadPermission(perm);
                    const readRequiredByWrite =
                      isRead &&
                      hasWriteEnabledInGroup(group, selectedPermissions);
                    const staffManagementLocksReadRole =
                      isReadRolePermission(perm) &&
                      isStaffManagementEnabled(selectedPermissions);
                    return (
                      <div
                        key={perm.id}
                        className="flex items-center space-x-2 p-1 rounded hover:bg-[var(--color-background-hover)]"
                      >
                        <Switch
                          id={`perm-${perm.id}`}
                          checked={selectedPermissions.includes(perm.id)}
                          onCheckedChange={(checked) =>
                            updatePermissionSelections(perm.id!, checked)
                          }
                          disabled={
                            readRequiredByWrite || staffManagementLocksReadRole
                          }
                        />
                        <FormLabel
                          htmlFor={`perm-${perm.id}`}
                          className="capitalize cursor-pointer flex-1"
                          title={
                            readRequiredByWrite
                              ? "Required when Create, Edit, Update, Delete, Resend or Send is enabled in this group"
                              : staffManagementLocksReadRole
                                ? "Required while any Staff Management permission is enabled"
                                : undefined
                          }
                        >
                          {perm.label}
                        </FormLabel>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <FormField
            control={form.control}
            name="permissions"
            render={() => (
              <FormMessage className="mt-2 text-red-500 font-medium" />
            )}
          />
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-[var(--color-border)]">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(returnPath)}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            variant="event-primary"
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isLoading ? "Creating..." : "Create Role"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
