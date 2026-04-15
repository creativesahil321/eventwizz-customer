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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import * as LucideIcons from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  PermissionGroup,
  PermissionItem,
  ProcessedPermissionGroup,
} from "../../_lib/types";
import { usePermissions, useRole } from "../../_lib/queries";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  updatePermissionsSchema,
  UpdatePermissionsFormValues,
} from "../../_lib/schemas";

interface PermissionsDialogProps {
  title?: string;
  roleId: string | number;
  permissions: PermissionGroup[];
  isDefault?: boolean;
  onSave?: (
    roleId: string | number,
    updatedPermissions: { [permission: string]: boolean },
    roleData: { label: string }
  ) => void;
}

export default function PermissionsDialog({
  roleId,
  onSave,
  title: initialTitle,
  isDefault = false,
}: PermissionsDialogProps) {
  const [permissionState, setPermissionState] = useState<{
    [key: string]: boolean;
  }>({});

  const [open, setOpen] = useState(false);
  const [isAllChecked, setIsAllChecked] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Group permissions by category
  const [displayPermissions, setDisplayPermissions] = useState<
    ProcessedPermissionGroup[]
  >([]);

  // Fetch role data which includes the permissions
  const {
    data: roleData,
    isLoading: roleLoading,
    refetch: refetchRole,
  } = useRole(typeof roleId === "string" ? parseInt(roleId) : roleId);

  // Fetch all permissions
  const { data: permissionsData, isLoading: permissionsLoading } =
    usePermissions();

  const form = useForm<UpdatePermissionsFormValues>({
    resolver: zodResolver(updatePermissionsSchema),
    defaultValues: {
      label: "",
    },
  });

  // Refetch role data when dialog opens
  useEffect(() => {
    if (open && roleId) {
      refetchRole();
    }
  }, [open, roleId, refetchRole]);

  useEffect(() => {
    if (roleData) {
      form.reset({
        label: roleData.label || "",
      });
    }
  }, [roleData, form]);

  // Process all permissions when data is loaded
  useEffect(() => {
    if (!permissionsData || !open) return;

    // Transform the API permissions data into the format we need
    const transformedGroups: ProcessedPermissionGroup[] = [];

    // Process all permissions from API
    permissionsData.forEach((group) => {
      const permissionItems: PermissionItem[] = group.permission.map(
        (perm) => ({
          id: perm.id,
          slug: perm.key || perm.slug,
          label: perm.title || perm.label || "",
          title: perm.title,
        })
      );

      if (permissionItems.length > 0) {
        transformedGroups.push({
          title: group.title,
          slug: group.title.toLowerCase().replace(/\s+/g, "-"),
          permissions: permissionItems,
        });
      }
    });

    setDisplayPermissions(transformedGroups);
  }, [permissionsData, open]);

  // Update permission state when role data is loaded
  useEffect(() => {
    if (!roleData || !displayPermissions.length) return;

    // Create a set of existing permission slugs for quick lookup
    const existingPermSlugs = new Set(
      roleData.permissions ? roleData.permissions.map((p) => p.slug) : []
    );

    // Initialize permission state - only set true for existing permissions
    const initialState: { [key: string]: boolean } = {};
    displayPermissions.forEach((group) => {
      group.permissions.forEach((perm) => {
        initialState[perm.id?.toString() || perm.slug] = existingPermSlugs.has(
          perm.slug
        );
      });
    });

    setPermissionState(initialState);
    updateAllCheckedState(initialState);
  }, [roleData, displayPermissions]);

  // Update the "all checked" state
  const updateAllCheckedState = (state: { [key: string]: boolean }) => {
    const permValues = Object.values(state);
    setIsAllChecked(
      permValues.length > 0 && permValues.every((val) => val === true)
    );
  };

  const getPermKey = (perm: PermissionItem) =>
    perm.id?.toString() || perm.slug;

  const normalizePermText = (s: string | undefined | null) =>
    (s ?? "").toLowerCase().trim();

  const isWriteAction = (perm: PermissionItem) => {
    const s = normalizePermText(perm.slug || perm.label);
    if (s.includes("read")) return false;
    return (
      s.includes("create") ||
      s.includes("delete") ||
      s.includes("edit") ||
      s.includes("update")
    );
  };

  const isReadPermission = (perm: PermissionItem) =>
    normalizePermText(perm.slug || perm.label).includes("read");

  const findReadPermissionInGroup = (group: ProcessedPermissionGroup) =>
    group.permissions.find((p) => isReadPermission(p));

  /**
   * Cross-group dependencies (practical backend requirements).
   * Example: Create Event needs Event Categories to be readable so category dropdown can load.
   */
  const findReadEventCategoryPermissionKey = (): string | null => {
    // Most reliable is slug/key match, but we also fall back to label/title heuristics.
    const candidates: PermissionItem[] = [];
    for (const group of displayPermissions) {
      for (const p of group.permissions) {
        const slug = normalizePermText(p.slug);
        const label = normalizePermText(p.label || p.title);
        const groupTitle = normalizePermText(group.title);

        const looksLikeRead =
          slug.includes("read") || label.startsWith("read ");
        const looksLikeEventCategory =
          (slug.includes("event") && slug.includes("categor")) ||
          (label.includes("event") && label.includes("categor")) ||
          (groupTitle.includes("event") && groupTitle.includes("categor"));

        if (looksLikeRead && looksLikeEventCategory) {
          candidates.push(p);
        }
      }
    }

    if (candidates.length === 0) return null;

    // Prefer the most explicit slug match if present.
    const best =
      candidates.find((p) => normalizePermText(p.slug).includes("read-event")) ??
      candidates[0];
    return getPermKey(best);
  };

  const isCreateEventPermission = (perm: PermissionItem) => {
    const slug = normalizePermText(perm.slug);
    const label = normalizePermText(perm.label || perm.title);
    return slug.includes("create-event") || label === "create event";
  };

  const isEventManagementPermission = (perm: PermissionItem) => {
    const slug = normalizePermText(perm.slug);
    const label = normalizePermText(perm.label || perm.title);
    // Avoid matching category/location/menu permissions (they have their own groups)
    const isEventWord = slug.includes("event") || label.includes("event");
    const isNotCategoryOrLocationOrMenu =
      !slug.includes("categor") &&
      !label.includes("categor") &&
      !slug.includes("location") &&
      !label.includes("location") &&
      !slug.includes("menu") &&
      !label.includes("menu");
    // Typical action slugs/labels for event management
    const isCrud =
      slug.includes("create") ||
      slug.includes("read") ||
      slug.includes("update") ||
      slug.includes("delete") ||
      label.startsWith("create ") ||
      label.startsWith("read ") ||
      label.startsWith("update ") ||
      label.startsWith("delete ");
    return isEventWord && isNotCategoryOrLocationOrMenu && isCrud;
  };

  const isReadEventCategoryPermissionKey = (permKey: string) => {
    for (const group of displayPermissions) {
      for (const p of group.permissions) {
        if (getPermKey(p) !== permKey) continue;
        const slug = normalizePermText(p.slug);
        const label = normalizePermText(p.label || p.title);
        const groupTitle = normalizePermText(group.title);
        const looksLikeRead =
          slug.includes("read") || label.startsWith("read ");
        const looksLikeEventCategory =
          (slug.includes("event") && slug.includes("categor")) ||
          (label.includes("event") && label.includes("categor")) ||
          (groupTitle.includes("event") && groupTitle.includes("categor"));
        return looksLikeRead && looksLikeEventCategory;
      }
    }
    return false;
  };

  const isEventManagementEnabled = (state: { [key: string]: boolean }) => {
    // Prefer group title detection when available; fallback to slug/label heuristics.
    for (const group of displayPermissions) {
      const groupTitle = normalizePermText(group.title);
      const isEventManagementGroup =
        groupTitle.includes("event") && groupTitle.includes("management");

      for (const p of group.permissions) {
        const enabled = state[getPermKey(p)] === true;
        if (!enabled) continue;

        if (isEventManagementGroup && isEventManagementPermission(p)) return true;
        if (!isEventManagementGroup && isEventManagementPermission(p)) {
          // Still count it as event-management if it clearly matches (some APIs don't group well)
          return true;
        }
      }
    }
    return false;
  };

  const hasWriteEnabledInGroup = (
    group: ProcessedPermissionGroup,
    state: { [key: string]: boolean }
  ) =>
    group.permissions.some(
      (p) => isWriteAction(p) && (state[getPermKey(p)] === true)
    );

  const togglePermission = (permId: string) => {
    if (isDefault) return;
    setPermissionState((prev) => {
      const isEnabling = !prev[permId];
      const newState = { ...prev, [permId]: !prev[permId] };

      if (isEnabling) {
        for (const group of displayPermissions) {
          const perm = group.permissions.find((p) => getPermKey(p) === permId);
          if (!perm || !isWriteAction(perm)) continue;
          const readPerm = findReadPermissionInGroup(group);
          if (readPerm) {
            const readKey = getPermKey(readPerm);
            newState[readKey] = true;
          }

          // Cross-group dependency: enabling "Create Event" requires "Read Event Category".
          if (isCreateEventPermission(perm)) {
            const readCategoryKey = findReadEventCategoryPermissionKey();
            if (readCategoryKey) {
              newState[readCategoryKey] = true;
            }
          }
          break;
        }
      } else {
        for (const group of displayPermissions) {
          const perm = group.permissions.find((p) => getPermKey(p) === permId);
          if (!perm || !isReadPermission(perm)) continue;
          if (hasWriteEnabledInGroup(group, prev)) {
            return prev;
          }
          break;
        }

        // Prevent disabling read-category while event-management remains enabled.
        if (isReadEventCategoryPermissionKey(permId)) {
          if (isEventManagementEnabled(prev)) {
            return prev;
          }
        }
      }

      updateAllCheckedState(newState);
      return newState;
    });
  };

  const toggleAllPermissions = (checked: boolean) => {
    if (isDefault) return;
    const newState: { [key: string]: boolean } = {};

    displayPermissions.forEach((group) => {
      group.permissions.forEach((perm) => {
        newState[perm.id?.toString() || perm.slug] = checked;
      });
    });

    setPermissionState(newState);
    setIsAllChecked(checked);
  };

  const handleDialogClose = (open: boolean) => {
    // Reset form errors when dialog is closed
    if (!open) {
      setFormError(null);
    }
    setOpen(open);
  };

  const handleSave = () => {
    const formValues = form.getValues();

    // Check for permissions
    const enabledPermissions = Object.values(permissionState).filter(Boolean);
    if (enabledPermissions.length === 0) {
      setFormError("At least one permission must be selected");
      return;
    }

    // Validate form data
    form.trigger().then((isValid) => {
      if (!isValid) {
        // Form has validation errors, they will be displayed by the form components
        return;
      }

      if (!roleId) {
        setFormError("Role ID is missing");
        return;
      }

      // Clear previous error
      setFormError(null);

      const roleDataToSave = {
        label: formValues.label,
      };

      if (onSave) {
        try {
          onSave(roleId, permissionState, roleDataToSave);
          setOpen(false);
        } catch (error) {
          console.error("Error in onSave callback:", error);
          setFormError("An error occurred while updating permissions");
        }
      } else {
        console.warn("No onSave callback provided to PermissionsDialog");
        setFormError("Unable to save permissions - component misconfiguration");
      }
    });
  };

  const getPermissionCount = () => {
    return Object.entries(permissionState).filter(([, isEnabled]) => isEnabled)
      .length;
  };

  const hasPermissions = displayPermissions.length > 0;
  const isLoading = permissionsLoading || roleLoading;

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button variant="event-primary" className="w-full">
          <LucideIcons.Shield className="h-4 w-4 mr-2" />
          {isDefault ? "View Permissions" : "Edit Permissions"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-1rem)] flex flex-col overflow-hidden sm:max-w-[95vw] md:max-w-[600px] lg:max-w-[825px]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-[var(--color-primary)] text-base sm:text-lg">
            Permissions for {roleData?.label || initialTitle || ""}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isDefault
              ? "Default role — view only. Permissions cannot be changed."
              : "Toggle the permissions for this role to control access to different parts of your account."}
            {getPermissionCount() > 0 && (
              <Badge className="ml-2 bg-[var(--color-primary)] text-white text-xs">
                {getPermissionCount()} enabled
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-1 px-1">
        <Form {...form}>
          <div className="grid grid-cols-1 gap-4 mb-4 text-black min-w-0">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel
                    htmlFor="role-label"
                    className="text-sm font-medium"
                  >
                    Role name
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="role-label"
                      {...field}
                      maxLength={50}
                      disabled={isDefault}
                      readOnly={isDefault}
                      onChange={(e) => {
                        if (isDefault) return;
                        const raw = e.target.value.slice(0, 50);
                        const value = raw.replace(
                          /[^a-zA-Z0-9\s\-']/g,
                          ""
                        );
                        e.target.value = value;
                        field.onChange(value);
                      }}
                      placeholder="E.g., Event Manager"
                      className="w-full"
                    />
                  </FormControl>
                  {!isDefault && (
                    <div className="flex items-center justify-between">
                      <FormDescription className="text-xs">
                        Letters, numbers, spaces, hyphens and apostrophes only
                      </FormDescription>
                      <span className="text-xs text-muted-foreground">
                        {field.value?.length || 0}/50
                      </span>
                    </div>
                  )}
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        </Form>

        {/* Display any form errors */}
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            <LucideIcons.AlertCircle className="h-4 w-4 inline-block mr-1" />
            {formError}
          </div>
        )}

        {!isDefault && (
          <div className="flex items-center justify-between sm:justify-end mb-2 border-b pb-2 text-black min-w-0">
            <Label
              htmlFor="toggle-all"
              className="mr-2 font-medium text-sm sm:text-base"
            >
              Toggle All Permissions
            </Label>
            <Switch
              id="toggle-all"
              checked={isAllChecked}
              onCheckedChange={toggleAllPermissions}
              className="data-[state=checked]:bg-[var(--color-primary)] shrink-0"
            />
          </div>
        )}

        <ScrollArea className="min-h-[200px] rounded-md border p-2 sm:p-4 text-black min-w-0">
          {isLoading ? (
            <div className="text-center p-4 sm:p-8">
              <LucideIcons.Loader2 className="h-8 w-8 sm:h-12 sm:w-12 text-[var(--color-primary)] mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground text-sm">
                Loading permissions...
              </p>
            </div>
          ) : hasPermissions ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
              {displayPermissions.map((group) => (
                <div
                  key={group.slug}
                  className="border border-[var(--color-border)] p-3 sm:p-4 rounded-lg shadow-sm bg-background min-w-0"
                >
                  <div className="flex items-center mb-2 min-w-0">
                    <LucideIcons.UserCog className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--color-primary)] mr-2 shrink-0" />
                    <h3 className="font-semibold text-sm sm:text-lg truncate">
                      {group.title}
                    </h3>
                  </div>
                  <Separator className="mb-3" />
                  <div className="grid grid-cols-1 gap-2 sm:gap-3 py-2 min-w-0">
                    {group.permissions.map((perm) => {
                      const permKey = getPermKey(perm);
                      const isRead = isReadPermission(perm);
                      const readRequiredByWrite =
                        isRead && hasWriteEnabledInGroup(group, permissionState);
                      const eventSystemLocksReadCategory =
                        isReadEventCategoryPermissionKey(permKey) &&
                        isEventManagementEnabled(permissionState);
                      return (
                        <div
                          key={perm.id || perm.slug}
                          className="flex items-center space-x-2 p-1 rounded hover:bg-[var(--color-background-hover)] min-w-0"
                        >
                          <Switch
                            id={permKey}
                            checked={permissionState[permKey] || false}
                            onCheckedChange={() => togglePermission(permKey)}
                            disabled={
                              isDefault ||
                              readRequiredByWrite ||
                              eventSystemLocksReadCategory
                            }
                            className="data-[state=checked]:bg-[var(--color-primary)] shrink-0"
                          />
                          <Label
                            htmlFor={permKey}
                            className="capitalize cursor-pointer flex-1 min-w-0 text-xs sm:text-sm truncate"
                            title={
                              readRequiredByWrite
                                ? "Required when Create, Edit, Update or Delete is enabled"
                                : eventSystemLocksReadCategory
                                  ? "Required while Event Management permissions are enabled"
                                : undefined
                            }
                          >
                            {perm.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8">
              <LucideIcons.AlertCircle className="h-12 w-12 text-[var(--color-warning)] mx-auto mb-4" />
              <p className="text-[var(--color-error)] text-sm font-medium mb-2">
                No permissions found.
              </p>
              <p className="text-muted-foreground text-sm">
                Please contact your system administrator.
              </p>
            </div>
          )}
        </ScrollArea>
        </div>

        <DialogFooter className="shrink-0 flex flex-col sm:flex-row gap-2 sm:gap-0 mt-4 min-w-0">
          <Button
            onClick={() => setOpen(false)}
            type="button"
            variant="event-outline"
            className="w-full sm:w-auto sm:mr-2"
          >
            <LucideIcons.X className="h-4 w-4 mr-2" />
            {isDefault ? "Close" : "Cancel"}
          </Button>
          {!isDefault && (
            <Button
              onClick={handleSave}
              type="submit"
              disabled={isLoading}
              variant="event-primary"
              className="w-full sm:w-auto"
            >
              <LucideIcons.Save className="h-4 w-4 mr-2" />
              Save changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
