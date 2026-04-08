"use client";

import { useEffect } from "react";
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
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Save, X, Loader2, ArrowLeft } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRoles } from "@/app/(protected)/_shared/manage-roles/_lib/queries";
import { useStaffById, useUpdateStaff } from "../_lib/queries";
import { UpdateStaffPayload } from "@/services/common/staff-management/type";
import { Role } from "@/services/common/manage-roles/type";
import { Switch } from "@/components/ui/switch";
import { editStaffSchema, EditStaffFormValues } from "../_lib/schemas";
import { LocationMultiSelect } from "./location-multi-select";
import { useVendorLocationsList } from "@/app/(protected)/vendor/venue-locations/_lib/queries";

interface EditStaffFormProps {
  readonly staffId: number;
  /** When true (admin dashboard), hide vendor location selection. */
  hideLocationSelection?: boolean;
}

export default function EditStaffForm({
  staffId,
  hideLocationSelection = false,
}: EditStaffFormProps) {
  const router = useRouter();

  // Fetch roles from the API
  const { data: rolesData, isLoading: isLoadingRoles } = useRoles();

  // Locations: same API/cache as header dropdown and venue-locations page (vendor only)
  const { locations, isLoading: isLoadingLocations } = useVendorLocationsList();

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
    resolver: zodResolver(editStaffSchema) as never,
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      role_id: 0,
      vendor_location_ids: [],
      password: "",
      confirmPassword: "",
      status: "active" as const,
    },
  });

  // Populate form when staff data is loaded
  useEffect(() => {
    if (staffData?.data) {
      const staff = staffData.data;

      // Prefer vendor_location_ids; else derive from locations (single-staff API returns locations as { id, city }[])
      let locationIds: number[] = [];
      if (!hideLocationSelection) {
        if (staff.vendor_location_ids?.length) {
          locationIds = staff.vendor_location_ids.filter(
            (id: number) => id !== 0,
          );
        } else if (Array.isArray(staff.locations) && staff.locations.length > 0) {
          const first = staff.locations[0];
          if (typeof first === "object" && first !== null && "id" in first) {
            locationIds = (staff.locations as { id: number }[]).map(
              (l) => l.id,
            );
          }
        }
        if (
          locationIds.length === 0 &&
          staff.vendor_location_id != null &&
          staff.vendor_location_id !== 0
        ) {
          locationIds = [staff.vendor_location_id];
        }
      }

      form.reset({
        first_name: staff.first_name,
        last_name: staff.last_name,
        email: staff.email,
        phone: staff.phone || "",
        role_id: staff.role_id,
        vendor_location_ids: locationIds,
        status: staff.status,
        password: "",
        confirmPassword: "",
      });

      form.setValue("role_id", staff.role_id);
      if (!hideLocationSelection) {
        form.setValue("vendor_location_ids", locationIds);
      }
    }
  }, [staffData, form]);

  // Form submission handler
  function onSubmit(values: EditStaffFormValues) {
    const payload: UpdateStaffPayload = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      phone: values.phone,
      role_id: values.role_id,
      vendor_location_ids: hideLocationSelection
        ? []
        : values.vendor_location_ids ?? [],
      status: values.status,
    };

    if (values.password && values.password.trim() !== "") {
      payload.password = values.password;
      payload.password_confirmation = values.confirmPassword;
    }

    if (isSubmitting) return;

    updateStaff(
      {
        id: staffId,
        data: payload,
      },
      {
        onSuccess: () => {
          router.push("/vendor/staff-management");
        },
        onError: (error: unknown) => {
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
      <CardContent className="px-4 sm:px-6">
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
                          if (value) {
                            const roleId = Number.parseInt(value, 10);
                            if (!Number.isNaN(roleId)) {
                              field.onChange(roleId);
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

              {!hideLocationSelection && (
                <FormField
                  control={form.control}
                  name="vendor_location_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Locations</FormLabel>
                      <FormControl>
                        <LocationMultiSelect
                          locations={locations}
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isLoadingLocations}
                          loading={isLoadingLocations}
                          placeholder="Select locations…"
                        />
                      </FormControl>
                      {!isLoadingLocations && field.value.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"
                            aria-hidden
                          />
                          {locations.length > 0 &&
                          field.value.length === locations.length
                            ? "This staff has access to all locations."
                            : (() => {
                                const names = field.value
                                  .map((id) => {
                                    const loc = locations.find((l) => l.id === id);
                                    return loc ? (loc.city || loc.name) : null;
                                  })
                                  .filter(Boolean) as string[];
                                const count = names.length;
                                const list =
                                  count <= 3
                                    ? names.join(", ")
                                    : `${names
                                        .slice(0, 2)
                                        .join(", ")} and ${count - 2} more`;
                                return `This staff has access to ${count} location${
                                  count === 1 ? "" : "s"
                                }: ${list}.`;
                              })()}
                        </p>
                      )}
                      <FormDescription>
                        Select one or more locations, or &quot;All&quot; for every
                        location.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

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
                        <PasswordInput
                          placeholder="Leave blank to keep current password"
                          ariaPasswordField="new password"
                          {...field}
                        />
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
                        <PasswordInput
                          placeholder="Leave blank to keep current password"
                          ariaPasswordField="confirm new password"
                          {...field}
                        />
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

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/vendor/staff-management")}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="event-primary"
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
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
