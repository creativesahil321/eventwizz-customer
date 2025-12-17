"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { UserSchema, UserType } from "./schema";
import { useCreateCustomer } from "../../_lib/queries";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { CustomerFormSkeleton } from "../skeleton-loader";
import { CustomerCreateResponse } from "@/services/vendor/customers/types";

export function CreateUserForm({
  onSubmitHandler,
}: {
  onSubmitHandler: (data: UserType) => void;
}) {
  const [apiErrors, setApiErrors] = useState<Record<string, string[]>>({});
  const createCustomerMutation = useCreateCustomer();

  const form = useForm<z.infer<typeof UserSchema>>({
    resolver: zodResolver(UserSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
      password_confirmation: "",
    },
  });

  const onSubmit = async (data: UserType) => {
    setApiErrors({});
    createCustomerMutation.mutate(data, {
      onSuccess: (response: CustomerCreateResponse) => {
        if (response?.status) {
          toast.success(response.message || "Customer created successfully");
          form.reset();
          if (typeof onSubmitHandler === "function") {
            onSubmitHandler(data as UserType);
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
          toast.error(response.message || "Failed to create customer");
        }
      },
      onError: (error: Error) => {
        console.error("Error creating customer:", error);
        toast.error("Failed to create customer");
      },
    });
  };

  // Clear API errors when form values change
  useEffect(() => {
    const subscription = form.watch(() => {
      setApiErrors({});
    });
    return () => subscription.unsubscribe();
  }, [form]);

  if (createCustomerMutation.isPending) {
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
                <FormLabel>First Name</FormLabel>
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
                <FormLabel>Last Name</FormLabel>
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  {...field}
                  className={apiErrors.email ? "border-red-500" : ""}
                />
              </FormControl>
              <FormMessage />
              {apiErrors.email && (
                <p className="text-sm text-red-500">{apiErrors.email[0]}</p>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="+1234567890"
                  {...field}
                  className={apiErrors.phone ? "border-red-500" : ""}
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...field}
                  className={apiErrors.password ? "border-red-500" : ""}
                />
              </FormControl>
              <FormMessage />
              {apiErrors.password && (
                <p className="text-sm text-red-500">{apiErrors.password[0]}</p>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password_confirmation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
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

        <section className="w-full flex items-center justify-end">
          <Button
            type="submit"
            variant="event-primary"
            className="flex items-center gap-2"
            disabled={createCustomerMutation.isPending}
          >
            <UserPlus size={18} />
            {createCustomerMutation.isPending
              ? "Creating..."
              : "Create Customer"}
          </Button>
        </section>
      </form>
    </Form>
  );
}
