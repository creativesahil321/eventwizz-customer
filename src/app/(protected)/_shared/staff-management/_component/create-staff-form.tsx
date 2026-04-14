"use client";

import { usePathname, useRouter } from "next/navigation";
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
import { LocationMultiSelect } from "./location-multi-select";
import { Save, X, Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCreateStaff } from "../_lib/queries";
import { useRoles } from "@/app/(protected)/_shared/manage-roles/_lib/queries";
import { CreateStaffPayload } from "@/services/common/staff-management/type";
import { Role } from "@/services/common/manage-roles/type";
import { createStaffSchema, CreateStaffFormValues } from "../_lib/schemas";
import { staffManagementListPath } from "../_lib/staff-routes";
import { useVendorLocationsList } from "@/app/(protected)/vendor/venue-locations/_lib/queries";

interface CreateStaffFormProps {
  /** When true (admin dashboard), hide vendor location selection. */
  hideLocationSelection?: boolean;
}

export default function CreateStaffForm({
  hideLocationSelection = false,
}: CreateStaffFormProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const staffListHref = staffManagementListPath(pathname);

  // Fetch roles from the API
  const { data: rolesData, isLoading: isLoadingRoles } = useRoles();

  // Locations: same API/cache as header dropdown and venue-locations page (vendor only)
  const { locations, isLoading: isLoadingLocations } = useVendorLocationsList();

  // Get the create staff mutation
  const { mutate: createStaff, isPending: isSubmitting } = useCreateStaff();

  // Define the form
  const form = useForm<CreateStaffFormValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      role_id: 0,
      vendor_location_ids: [],
      password: "",
      confirmPassword: "",
    },
  });

  // Form submission handler
  async function onSubmit(values: z.infer<typeof createStaffSchema>) {
    const { confirmPassword, ...staffData } = values;

    // Create the payload with password_confirmation to match API expectations
    const apiPayload: CreateStaffPayload = {
      ...staffData,
      password_confirmation: confirmPassword,
      // For admin staff, location selection is not used; backend will ignore empty array.
      vendor_location_ids: hideLocationSelection
        ? []
        : staffData.vendor_location_ids,
    };

    createStaff(apiPayload, {
      onSuccess: () => {
        router.push(staffListHref);
      },
      onError: (error: unknown) => {
        if (error && typeof error === "object" && "errors" in error) {
          Object.entries(error.errors as Record<string, string>).forEach(
            ([key, value]) => {
              if (key in form.getValues()) {
                form.setError(key as keyof z.infer<typeof createStaffSchema>, {
                  type: "server",
                  message: Array.isArray(value) ? value[0] : (value as string),
                });
              }
            },
          );
        }
      },
    });
  }

  // Get roles for the dropdown
  const roles = rolesData || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Information</CardTitle>
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
                      <FormDescription>
                        Enter the staff member&apos;s first name.
                      </FormDescription>
                      <span className="text-xs text-muted-foreground">
                        {field.value?.length || 0}/50
                      </span>
                    </div>
                    <FormMessage />
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
                      <FormDescription>
                        Enter the staff member&apos;s last name.
                      </FormDescription>
                      <span className="text-xs text-muted-foreground">
                        {field.value?.length || 0}/50
                      </span>
                    </div>
                    <FormMessage />
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
                      <FormDescription>
                        This email will be used for login and communication.
                      </FormDescription>
                      <span className="text-xs text-muted-foreground">
                        {field.value?.length || 0}/255
                      </span>
                    </div>
                    <FormMessage />
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
                            "",
                          );
                          // Limit to 20 characters
                          const limitedValue = value.slice(0, 20);
                          e.target.value = limitedValue;
                          field.onChange(limitedValue);
                        }}
                      />
                    </FormControl>
                    <div className="flex items-center justify-between">
                      <FormDescription>
                        Staff member&apos;s contact phone number.
                      </FormDescription>
                      <span className="text-xs text-muted-foreground">
                        {field.value?.length || 0}/20
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="********" {...field} />
                    </FormControl>
                    <FormDescription>
                      Password must be at least 8 characters.
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
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="********"
                        ariaPasswordField="confirm password"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="role_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const roleId = parseInt(value);
                        field.onChange(roleId);
                      }}
                      defaultValue={
                        field.value ? field.value.toString() : undefined
                      }
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
                        ) : roles.length > 0 ? (
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
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The role determines what permissions the staff member will
                      have.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
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
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(staffListHref)}
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
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Staff
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
