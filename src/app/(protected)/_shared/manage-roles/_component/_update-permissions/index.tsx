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
  onSave?: (
    roleId: string | number,
    updatedPermissions: { [permission: string]: boolean },
    roleData: { slug: string; label: string }
  ) => void;
}

export default function PermissionsDialog({
  roleId,
  onSave,
  title: initialTitle,
}: PermissionsDialogProps) {
  // State for permission toggles
  const [permissionState, setPermissionState] = useState<{
    [key: string]: boolean;
  }>({});

  // Dialog state
  const [open, setOpen] = useState(false);
  const [isAllChecked, setIsAllChecked] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Track if slug was manually edited
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

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

  // Set up form
  const form = useForm<UpdatePermissionsFormValues>({
    resolver: zodResolver(updatePermissionsSchema),
    defaultValues: {
      slug: "",
      label: "",
    },
  });

  // Auto-generate slug from label
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "label") {
        const labelValue = value.label || "";
        const generatedSlug = labelValue
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");

        // Only update slug if user hasn't manually edited it yet
        // or if it's currently empty
        const currentSlug = form.getValues("slug");
        if (!currentSlug || currentSlug === "") {
          form.setValue("slug", generatedSlug, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Refetch role data when dialog opens
  useEffect(() => {
    if (open && roleId) {
      refetchRole();
    }
  }, [open, roleId, refetchRole]);

  // Initialize role data from fetched data
  useEffect(() => {
    if (roleData) {
      form.reset({
        slug: roleData.slug || "",
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

  const togglePermission = (permId: string) => {
    setPermissionState((prev) => {
      const newState = { ...prev, [permId]: !prev[permId] };
      updateAllCheckedState(newState);
      return newState;
    });
  };

  const toggleAllPermissions = (checked: boolean) => {
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
        slug: formValues.slug,
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
          Edit Permissions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-[95vw] md:max-w-[600px] lg:max-w-[825px]">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-primary)] text-base sm:text-lg">
            Permissions for {roleData?.label || initialTitle || ""}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Toggle the permissions for this role to control access to different
            parts of your account.
            {getPermissionCount() > 0 && (
              <Badge className="ml-2 bg-[var(--color-primary)] text-white text-xs">
                {getPermissionCount()} enabled
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          {/* Role Information Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-black min-w-0">
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel
                      htmlFor="role-label"
                      className="text-sm font-medium"
                    >
                      Role Label
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="role-label"
                        {...field}
                        maxLength={50}
                        onChange={(e) => {
                          // Limit to 50 characters
                          const value = e.target.value.slice(0, 50);
                          e.target.value = value;

                          // Call the original onChange handler
                          field.onChange(e);

                          // Get label value
                          const labelValue = value;

                          // Generate slug from label
                          const generatedSlug = labelValue
                            .toLowerCase()
                            .replace(/\s+/g, "-")
                            .replace(/[^a-z0-9-]/g, "");

                          // Update slug if it hasn't been manually edited
                          if (!slugManuallyEdited) {
                            form.setValue("slug", generatedSlug, {
                              shouldValidate: true,
                            });
                          }
                        }}
                        placeholder="Enter role label"
                        className="w-full"
                      />
                    </FormControl>
                    <div className="flex items-center justify-between">
                      <FormMessage className="text-xs" />
                      <span className="text-xs text-muted-foreground">
                        {field.value?.length || 0}/50
                      </span>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel
                      htmlFor="role-slug"
                      className="text-sm font-medium"
                    >
                      Role Slug
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="role-slug"
                        {...field}
                        maxLength={50}
                        onChange={(e) => {
                          // Limit to 50 characters
                          const value = e.target.value.slice(0, 50);
                          e.target.value = value;
                          field.onChange(e);
                          // Mark slug as manually edited if user types in it
                          if (value !== "") {
                            setSlugManuallyEdited(true);
                          }
                        }}
                        placeholder="Enter role slug"
                        className="w-full"
                      />
                    </FormControl>
                    <div className="flex items-center justify-between">
                      <FormDescription className="text-xs">
                        Lowercase letters, numbers, and hyphens only
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
          </div>
        </Form>

        {/* Display any form errors */}
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            <LucideIcons.AlertCircle className="h-4 w-4 inline-block mr-1" />
            {formError}
          </div>
        )}

        {/* Global toggle all switch */}
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

        <ScrollArea className="h-[300px] sm:h-[350px] overflow-y-auto rounded-md border p-2 sm:p-4 text-black min-w-0">
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
                    {group.permissions.map((perm) => (
                      <div
                        key={perm.id || perm.slug}
                        className="flex items-center space-x-2 p-1 rounded hover:bg-[var(--color-background-hover)] min-w-0"
                      >
                        <Switch
                          id={perm.id?.toString() || perm.slug}
                          checked={
                            permissionState[perm.id?.toString() || perm.slug] ||
                            false
                          }
                          onCheckedChange={() =>
                            togglePermission(perm.id?.toString() || perm.slug)
                          }
                          className="data-[state=checked]:bg-[var(--color-primary)] shrink-0"
                        />
                        <Label
                          htmlFor={perm.id?.toString() || perm.slug}
                          className="capitalize cursor-pointer flex-1 min-w-0 text-xs sm:text-sm truncate"
                        >
                          {perm.label}
                        </Label>
                      </div>
                    ))}
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

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 mt-4 min-w-0">
          <Button
            onClick={() => setOpen(false)}
            type="button"
            variant="event-outline"
            className="w-full sm:w-auto sm:mr-2"
          >
            <LucideIcons.X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
