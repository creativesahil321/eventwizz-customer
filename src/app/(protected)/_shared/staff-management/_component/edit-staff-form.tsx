"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Save, X, Loader2, Shield, ArrowLeft } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRoles } from "@/app/(protected)/_shared/manage-roles/_lib/queries";
import { useStaffById, useUpdateStaff } from "../_lib/queries";
import { UpdateStaffPayload } from "@/services/common/staff-management/type";
import { Role } from "@/services/common/manage-roles/type";
import StaffPermissionsDialog from "./permissions-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { editStaffSchema, EditStaffFormValues } from "../_lib/schemas";

interface EditStaffFormProps {
  readonly staffId: number;
}

export default function EditStaffForm({ staffId }: EditStaffFormProps) {
  const router = useRouter();
  const [customPermissions, setCustomPermissions] = useState<{
    [key: string]: boolean;
  }>({});
  const [hasCustomizedPermissions, setHasCustomizedPermissions] =
    useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch roles from the API
  const { data: rolesData, isLoading: isLoadingRoles } = useRoles();

  // Fetch staff data
  const {
    data: staffData,
    isLoading: isLoadingStaff,
    isError,
    error,
  } = useStaffById(staffId);

  // Get the update staff mutation
  const { mutate: updateStaff, isPending: isSubmitting } = useUpdateStaff();

  // Define the form
  const form = useForm<EditStaffFormValues>({
    resolver: zodResolver(editStaffSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      role_id: 0,
      password: "",
      confirmPassword: "",
      status: "active" as const,
    },
  });

  // Populate form when staff data is loaded
  useEffect(() => {
    if (staffData?.data) {
      const staff = staffData.data;

      // Set form values directly from API response
      form.reset({
        first_name: staff.first_name,
        last_name: staff.last_name,
        email: staff.email,
        phone: staff.phone || "",
        role_id: staff.role_id, // This is a number value
        status: staff.status,
        password: "",
        confirmPassword: "",
      });

      // Force immediate role_id update
      form.setValue("role_id", staff.role_id);

      // If staff has permissions, load them
      if (staff.permissions && staff.permissions.length > 0) {
        const permissionsMap: { [key: string]: boolean } = {};
        staff.permissions.forEach((perm: { key: string }) => {
          permissionsMap[perm.key] = true;
        });
        setCustomPermissions(permissionsMap);
        setHasCustomizedPermissions(true);
      }
    }
  }, [staffData, form]);

  // Handle permission changes from the dialog
  const handlePermissionsChange = (permissions: { [key: string]: boolean }) => {
    setCustomPermissions(permissions);
    setHasCustomizedPermissions(true);
  };

  // Form submission handler
  function onSubmit(values: EditStaffFormValues) {
    // Create payload for API
    const payload: UpdateStaffPayload = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      phone: values.phone,
      role_id: values.role_id,
      status: values.status,
    };

    // Only include password fields if they're provided and not empty
    if (values.password && values.password.trim() !== "") {
      payload.password = values.password;
      payload.password_confirmation = values.confirmPassword;
    }

    // Add custom permissions if they exist
    if (hasCustomizedPermissions && Object.keys(customPermissions).length > 0) {
      // Extract enabled permission keys
      const enabledPermissions = Object.entries(customPermissions)
        .filter(([, isEnabled]) => isEnabled)
        .map(([key]) => key);

      // Add to payload as permissions
      if (enabledPermissions.length > 0) {
        payload.permissions = enabledPermissions;
      } else {
        // No permissions are selected, show error
        form.setError("role_id", {
          type: "custom",
          message: "At least one permission must be selected",
        });
        return;
      }
    } else {
      // No permissions have been customized, show error
      form.setError("role_id", {
        type: "custom",
        message: "At least one permission must be selected",
      });
      return;
    }

    // Prevent duplicate submissions
    if (isSubmitting) return;

    updateStaff(
      {
        id: staffId,
        data: payload,
      },
      {
        onSuccess: () => {
          // Redirect back to staff management
          router.push("/vendor/staff-management");
        },
        onError: (error: unknown) => {
          // Check for validation errors from the API
          if (error && typeof error === "object" && "errors" in error) {
            const errorObj = error as {
              errors: Record<string, string | string[]>;
            };
            Object.entries(errorObj.errors).forEach(([key, value]) => {
              if (key in form.getValues()) {
                form.setError(key as keyof EditStaffFormValues, {
                  type: "server",
                  message: Array.isArray(value) ? value[0] : value,
                });
              }
            });
          }
        },
      }
    );
  }

  // Get roles for the dropdown
  const roles = rolesData || [];

  // Get count of enabled permissions
  const getEnabledPermissionsCount = () => {
    return Object.values(customPermissions).filter(Boolean).length;
  };

  // Show loading state
  if (isLoadingStaff) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Skeleton className="h-5 w-20 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-5 w-20 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div>
              <Skeleton className="h-5 w-20 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="w-full p-6 border border-red-200 rounded-lg bg-red-50">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertCircle className="h-5 w-5" />
          <h3 className="font-semibold">Error Loading Staff Member</h3>
        </div>
        <p className="text-red-700 mb-4">
          {error instanceof Error
            ? error.message
            : "Failed to load staff data. Please try again."}
        </p>

        <Button
          variant="ghost"
          onClick={() => router.push("/vendor/staff-management")}
          className="mb-4 pl-0 text-[var(--color-primary)]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Staff Management
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Staff Member</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John"
                        {...field}
                        maxLength={50}
                        onChange={(e) => {
                          // Limit to 50 characters
                          const value = e.target.value.slice(0, 50);
                          e.target.value = value;
                          field.onChange(e);
                        }}
                      />
                    </FormControl>
                    <div className="flex items-center justify-between">
                      <FormMessage />
                      <span className="text-xs text-muted-foreground">
                        {field.value?.length || 0}/50
                      </span>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Doe"
                        {...field}
                        maxLength={50}
                        onChange={(e) => {
                          // Limit to 50 characters
                          const value = e.target.value.slice(0, 50);
                          e.target.value = value;
                          field.onChange(e);
                        }}
                      />
                    </FormControl>
                    <div className="flex items-center justify-between">
                      <FormMessage />
                      <span className="text-xs text-muted-foreground">
                        {field.value?.length || 0}/50
                      </span>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john.doe@example.com"
                        {...field}
                        maxLength={255}
                        onChange={(e) => {
                          // Limit to 255 characters
                          const value = e.target.value.slice(0, 255);
                          e.target.value = value;
                          field.onChange(e);
                        }}
                      />
                    </FormControl>
                    <div className="flex items-center justify-between">
                      <FormMessage />
                      <span className="text-xs text-muted-foreground">
                        {field.value?.length || 0}/255
                      </span>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="9876543210"
                        {...field}
                        maxLength={20}
                        onChange={(e) => {
                          // Only allow numbers, spaces, dashes, plus signs, and parentheses
                          const value = e.target.value.replace(
                            /[^\d\s\-+()]/g,
                            ""
                          );
                          // Limit to 20 characters
                          const limitedValue = value.slice(0, 20);
                          e.target.value = limitedValue;
                          field.onChange(limitedValue);
                        }}
                      />
                    </FormControl>
                    <div className="flex items-center justify-between">
                      <FormMessage />
                      <span className="text-xs text-muted-foreground">
                        {field.value?.length || 0}/20
                      </span>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        {field.value === "active"
                          ? "Staff member can log in and access the system"
                          : "Staff member cannot log in to the system"}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        className="data-[state=checked]:bg-[var(--color-primary)]"
                        checked={field.value === "active"}
                        onCheckedChange={(checked) =>
                          field.onChange(checked ? "active" : "inactive")
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role_id"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          // Only update if we have a non-empty value
                          if (value) {
                            const roleId = Number.parseInt(value, 10);
                            if (!Number.isNaN(roleId)) {
                              field.onChange(roleId);
                              // Reset permissions when role changes
                              if (roleId !== field.value) {
                                setCustomPermissions({});
                                setHasCustomizedPermissions(false);
                              }
                            }
                          }
                        }}
                        value={field.value ? field.value.toString() : undefined}
                        disabled={isLoadingRoles}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isLoadingRoles
                                  ? "Loading roles..."
                                  : "Select a role"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingRoles ? (
                            <div className="flex items-center justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Loading roles...
                            </div>
                          ) : (
                            <>
                              {roles.length > 0 ? (
                                roles.map((role: Role) => (
                                  <SelectItem
                                    key={role.id}
                                    value={role.id.toString()}
                                  >
                                    {role.label}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-sm text-gray-500">
                                  No roles available
                                </div>
                              )}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            {/* Permissions section */}
            {form.watch("role_id") ? (
              <div className="border p-4 rounded-md bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm font-medium">Role Permissions</h3>
                    <p className="text-xs text-gray-500">
                      {hasCustomizedPermissions
                        ? "Using customized permissions for this staff member"
                        : "Using default role permissions"}
                    </p>
                  </div>
                  {hasCustomizedPermissions && (
                    <Badge className="bg-[var(--color-primary)]">
                      {getEnabledPermissionsCount()} permissions enabled
                    </Badge>
                  )}
                </div>

                <StaffPermissionsDialog
                  roleId={form.watch("role_id")}
                  initialPermissions={customPermissions}
                  onPermissionsChange={handlePermissionsChange}
                  triggerComponent={
                    <Button variant="outline" className="w-full" type="button">
                      <Shield className="h-4 w-4 mr-2" />
                      {hasCustomizedPermissions
                        ? "Edit Custom Permissions"
                        : "Customize Permissions"}
                    </Button>
                  }
                />
              </div>
            ) : null}

            <div className="border-t border-b py-4 my-4">
              <h3 className="text-lg font-medium mb-2">Change Password</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Leave these fields blank if you don&apos;t want to change the
                password.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Leave blank to keep current password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="event-ghost"
                            className="absolute right-0 top-1 h-10 px-3 text-xs font-medium text-red-500"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? "Hide" : "Show"}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Must be at least 8 characters if provided.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Leave blank to keep current password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="event-ghost"
                            className="absolute right-0 top-1 h-10 px-3 text-xs font-medium text-red-500"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                          >
                            {showConfirmPassword ? "Hide" : "Show"}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Re-enter the password to confirm.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/vendor/staff-management")}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="event-primary"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
