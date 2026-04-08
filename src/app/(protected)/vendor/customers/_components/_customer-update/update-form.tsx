"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { UserSchema, UserType } from "./schema";
import { Customer } from "../../_lib/types";
import { toast } from "sonner";
import { useUpdateCustomer } from "../../_lib/queries";
import { CustomerFormSkeleton } from "../skeleton-loader";
import { CustomerUpdateResponse } from "@/services/vendor/customers/types";

type UpdateCustomerProps = {
  customer: Customer;
  onSubmitHandler: (data?: UserType) => void;
};

export function UpdateCustomerForm({
  customer,
  onSubmitHandler,
}: UpdateCustomerProps) {
  const [apiErrors, setApiErrors] = useState<Record<string, string[]>>({});
  const updateCustomerMutation = useUpdateCustomer();

  const form = useForm<z.infer<typeof UserSchema>>({
    resolver: zodResolver(UserSchema),
    defaultValues: {
      first_name: customer?.first_name || "",
      last_name: customer?.last_name || "",
      email: String(customer?.email).toLowerCase() || "",
      phone: customer?.phone || "",
      password: "",
      password_confirmation: "",
      status: customer?.status || "active",
    },
  });

  const onSubmit = async (data: UserType) => {
    setApiErrors({});

    // Filter out empty password fields if not provided and exclude email since it's disabled
    const updateData = {
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      status: data.status,
      ...(data.password &&
        data.password.length > 0 && { password: data.password }),
      ...(data.password &&
        data.password.length > 0 &&
        data.password_confirmation && {
          password_confirmation: data.password_confirmation,
        }),
    };

    updateCustomerMutation.mutate(
      { id: customer?.id || 0, data: updateData },
      {
        onSuccess: (response: CustomerUpdateResponse) => {
          if (response?.status) {
            // Success toast is handled by API interceptor
            form.reset();
            if (typeof onSubmitHandler === "function") {
              onSubmitHandler(data);
            }
          } else {
            // Handle validation errors from API
            if (
              response?.errors &&
              typeof response.errors === "object" &&
              !Array.isArray(response.errors)
            ) {
              const errors = response.errors as Record<string, string[]>;
              setApiErrors(errors);
              // Set form errors for each field
              Object.keys(errors).forEach((field: string) => {
                const fieldErrors = errors[field];
                if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
                  form.setError(field as keyof UserType, {
                    type: "manual",
                    message: fieldErrors[0],
                  });
                }
              });
            }
            toast.error(response.message || "Failed to update customer");
          }
        },
        onError: (error: Error) => {
          console.error("Error updating customer:", error);
          toast.error("Failed to update customer");
        },
      }
    );
  };

  // Clear API errors when form values change
  useEffect(() => {
    const subscription = form.watch(() => {
      setApiErrors({});
    });
    return () => subscription.unsubscribe();
  }, [form]);

  if (updateCustomerMutation.isPending) {
    return <CustomerFormSkeleton />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
        <section className="w-full flex items-center gap-4 justify-between">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="text-foreground opacity-70">
                  First Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="John"
                    {...field}
                    className={apiErrors.first_name ? "border-red-500" : ""}
                  />
                </FormControl>
                <FormMessage />
                {apiErrors.first_name && (
                  <p className="text-sm text-red-500">
                    {apiErrors.first_name[0]}
                  </p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="text-foreground opacity-70">
                  Last Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Doe"
                    {...field}
                    className={apiErrors.last_name ? "border-red-500" : ""}
                  />
                </FormControl>
                <FormMessage />
                {apiErrors.last_name && (
                  <p className="text-sm text-red-500">
                    {apiErrors.last_name[0]}
                  </p>
                )}
              </FormItem>
            )}
          />
        </section>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground opacity-70">
                Email
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  {...field}
                  disabled
                  className={`${
                    apiErrors.email ? "border-red-500" : ""
                  } bg-gray-100 dark:bg-gray-800 cursor-not-allowed`}
                />
              </FormControl>
              <FormMessage />
              {apiErrors.email && (
                <p className="text-sm text-red-500">{apiErrors.email[0]}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Email cannot be changed
              </p>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground opacity-70">
                Phone
              </FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="+1234567890"
                  {...field}
                  className={apiErrors.phone ? "border-red-500" : ""}
                  onChange={(e) => {
                    // Only allow numbers, spaces, dashes, plus signs, and parentheses
                    const value = e.target.value.replace(/[^\d\s\-+()]/g, "");
                    e.target.value = value;
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormMessage />
              {apiErrors.phone && (
                <p className="text-sm text-red-500">{apiErrors.phone[0]}</p>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground opacity-70">
                Status
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger
                    className={apiErrors.status ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
              {apiErrors.status && (
                <p className="text-sm text-red-500">{apiErrors.status[0]}</p>
              )}
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground opacity-70">
            Change Password (Optional)
          </h4>

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground opacity-70">
                  New Password
                </FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="••••••••"
                    ariaPasswordField="new password"
                    {...field}
                    className={apiErrors.password ? "border-red-500" : ""}
                  />
                </FormControl>
                <FormMessage />
                {apiErrors.password && (
                  <p className="text-sm text-red-500">
                    {apiErrors.password[0]}
                  </p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password_confirmation"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground opacity-70">
                  Confirm New Password
                </FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="••••••••"
                    ariaPasswordField="confirm new password"
                    {...field}
                    className={
                      apiErrors.password_confirmation ? "border-red-500" : ""
                    }
                  />
                </FormControl>
                <FormMessage />
                {apiErrors.password_confirmation && (
                  <p className="text-sm text-red-500">
                    {apiErrors.password_confirmation[0]}
                  </p>
                )}
              </FormItem>
            )}
          />
        </div>

        <section className="w-full flex items-center justify-end">
          <Button
            variant="event-primary"
            type="submit"
            disabled={updateCustomerMutation.isPending}
          >
            {updateCustomerMutation.isPending
              ? "Updating..."
              : "Update Customer"}
          </Button>
        </section>
      </form>
    </Form>
  );
}
