"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Customer } from "../../_lib/types";
import React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";
import { customersService } from "@/services/vendor/customers/customers.service";

interface LoginAsDialogProps
  extends React.ComponentPropsWithoutRef<typeof Dialog> {
  customer: Customer | null;
  showTrigger?: boolean;
  onSuccess?: () => void;
}

// Zod schema for master password
const loginAsSchema = z.object({
  masterPassword: z
    .string()
    .min(1, "Master password is required")
    .min(6, "Master password must be at least 6 characters"),
});

type LoginAsFormValues = z.infer<typeof loginAsSchema>;

export default function LoginAs({
  customer,
  showTrigger = true,
  onSuccess,
  ...props
}: LoginAsDialogProps) {
  const [isPending, startTransition] = React.useTransition();
  const isDesktop = useMediaQuery("(min-width: 640px)");

  // Initialize form with React Hook Form and Zod
  const form = useForm<LoginAsFormValues>({
    resolver: zodResolver(loginAsSchema),
    defaultValues: {
      masterPassword: "",
    },
  });

  // Handle form submission
  const onSubmit = (values: LoginAsFormValues) => {
    startTransition(async () => {
      const { error } = await customersService.loginAsCustomer(
        customer?.id || 0,
        values.masterPassword
      );
      if (error) {
        toast.error(error);
        return;
      }

      props.onOpenChange?.(false);
      toast.success(
        `Logged in as customer ${customer?.first_name || "unknown"}`
      );
      if (typeof onSuccess === "function") {
        onSuccess();
      }
    });
  };

  if (!isDesktop) {
    return null; // Mobile not supported, per original logic
  }

  return (
    <Dialog {...props}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <UserPlus className="mr-2 size-4" aria-hidden="true" />
            Login
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle className="text-black">
            Login as {customer?.first_name || "Customer"}
          </DialogTitle>
          <DialogDescription>
            Enter the master password to log in as this customer.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 py-4"
          >
            <FormField
              control={form.control}
              name="masterPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Master Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter master password"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:space-x-0">
              <DialogClose asChild>
                <Button variant="event-outline">Cancel</Button>
              </DialogClose>
              <Button
                type="submit"
                variant="event-primary"
                disabled={isPending}
              >
                {isPending && <PageLoader />}
                Login
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
