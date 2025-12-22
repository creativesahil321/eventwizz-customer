"use client";

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
import { Save, X, Loader2, Shield } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCreateStaff } from "../_lib/queries";
import { useRoles } from "@/app/(protected)/_shared/manage-roles/_lib/queries";
import { CreateStaffPayload } from "@/services/common/staff-management/type";
import { Role } from "@/services/common/manage-roles/type";
import StaffPermissionsDialog from "./permissions-dialog";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { createStaffSchema, CreateStaffFormValues } from "../_lib/schemas";

export default function CreateStaffForm() {
  const router = useRouter();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [customPermissions, setCustomPermissions] = useState<{
    [key: string]: boolean;
  }>({});
  const [hasCustomizedPermissions, setHasCustomizedPermissions] =
    useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch roles from the API
  const { data: rolesData, isLoading: isLoadingRoles } = useRoles();

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
      password: "",
      confirmPassword: "",
    },
  });

  // Handle permission changes from the dialog
  const handlePermissionsChange = (permissions: { [key: string]: boolean }) => {
    setCustomPermissions(permissions);
    setHasCustomizedPermissions(true);
  };

  // Form submission handler
  async function onSubmit(values: z.infer<typeof createStaffSchema>) {
    const { confirmPassword, ...staffData } = values;

    // Create the payload with password_confirmation to match API expectations
    const apiPayload: CreateStaffPayload = {
      ...staffData,
      password_confirmation: confirmPassword,
    };

    // Add custom permissions if they exist
    if (hasCustomizedPermissions && Object.keys(customPermissions).length > 0) {
      // Extract enabled permission slugs/IDs
      const enabledPermissions = Object.entries(customPermissions)
        .filter(([, isEnabled]) => isEnabled)
        .map(([key]) => {
          // Try to parse as integer first for ID-based permissions
          const numericId = parseInt(key);
          return !isNaN(numericId) ? numericId : key;
        });

      // Add to payload based on whether we have numeric IDs or string slugs
      if (
        enabledPermissions.length > 0 &&
        typeof enabledPermissions[0] === "number"
      ) {
        // If we have numeric IDs, use the permissions field
        apiPayload.permissions = enabledPermissions as string[];
      } else {
        // If we have string slugs, use the permissions field
        apiPayload.permissions = enabledPermissions as string[];
      }
    }

    createStaff(apiPayload, {
      onSuccess: () => {
        // Redirect back to staff management on success
        router.push("/vendor/staff-management");
      },
      onError: (error: unknown) => {
        // Error handling is already done in the mutation hook,
        // but we can add additional custom handling here if needed

        // Check for validation errors from the API and update the form
        if (error && typeof error === "object" && "errors" in error) {
          Object.entries(error.errors as Record<string, string>).forEach(([key, value]) => {
            if (key in form.getValues()) {
              form.setError(key as keyof z.infer<typeof createStaffSchema>, {
                type: "server",
                message: Array.isArray(value) ? value[0] : (value as string),
              });
            }
          });
        }
      },
    });
  }

  // Get roles for the dropdown
  const roles = rolesData || [];

  // Get count of enabled permissions
  const getEnabledPermissionsCount = () => {
    return Object.values(customPermissions).filter(Boolean).length;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Information</CardTitle>
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
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="********"
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
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="********"
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

            <div className="space-y-4">
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
                        setSelectedRoleId(roleId);
                        setCustomPermissions({});
                        setHasCustomizedPermissions(false);
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

              {selectedRoleId ? (
                <div className="border p-4 rounded-md bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="text-sm font-medium">Permissions</h3>
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
                    roleId={selectedRoleId}
                    initialPermissions={customPermissions}
                    onPermissionsChange={handlePermissionsChange}
                    triggerComponent={
                      <Button
                        variant="outline"
                        className="w-full"
                        type="button"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        {hasCustomizedPermissions
                          ? "Edit Custom Permissions"
                          : "Customize Permissions"}
                      </Button>
                    }
                  />
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
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
