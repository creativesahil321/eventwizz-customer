"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm, SubmitHandler, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LocationFormValues, locationSchema } from "../_lib/validations";
import { useUpdateLocation } from "../_lib/queries";
import { Location } from "../_lib/types";
import { slugify } from "@/lib/utils";
import { env } from "@/env";
import GoogleLocationSearch from "@/app/(on-boarding)/on-boarding/_components/steps/step-11/google-location-search";
import { fetchLocationDetails } from "@/app/(on-boarding)/on-boarding/_components/steps/step-11/_lib/actions";

interface UpdateLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location;
  isSettingDefault?: boolean;
}

export default function UpdateLocationDialog({
  open,
  onOpenChange,
  location,
  isSettingDefault = false,
}: UpdateLocationDialogProps) {
  const { mutate: updateLocation, isPending } = useUpdateLocation(location.id);

  // Ensure is_default is always a boolean in the form
  const form = useForm({
    resolver: zodResolver(locationSchema) as Resolver<LocationFormValues>,
    defaultValues: {
      name: location.name || "",
      address: location.address || "",
      city: location.city || "",
      slug: location.slug || "",
      is_default: Boolean(location.is_default),
      contact_number: location.contact_number || "",
      email: location.email || "",
    },
  });

  // Update form when location changes
  useEffect(() => {
    form.reset({
      name: location.name || "",
      address: location.address || "",
      city: location.city || "",
      slug: location.slug || "",
      is_default: Boolean(location.is_default),
      contact_number: location.contact_number || "",
      email: location.email || "",
    });
  }, [form, location]);

  const onSubmit: SubmitHandler<LocationFormValues> = (data) => {
    // Generate slug from city if not provided
    if (!data.slug) {
      data.slug = slugify(data.city);
    }

    // Preserve the original location name
    const updatedData = {
      ...data,
      name: location.name, // Keep the original name
    };

    // Use boolean directly without conversion
    updateLocation(updatedData, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] text-black">
        <DialogHeader>
          <DialogTitle>
            {isSettingDefault ? "Set Default Location" : "Update Location"}
          </DialogTitle>
          <DialogDescription>
            {isSettingDefault
              ? "Are you sure you want to set this as your default location?"
              : `Update the details of this location for ${location.name}.`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Hidden field for name */}
            <input type="hidden" {...form.register("name")} />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <GoogleLocationSearch
                      apiKey={env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                      value={field.value || ""}
                      onChange={(value) => field.onChange(value)}
                      onSelect={(placeId) =>
                        fetchLocationDetails(form , placeId)
                      }
                      placeholder="Search for a location..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. London"
                      {...field}
                      autoComplete="off"
                      disabled={isSettingDefault}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. venue@example.com"
                      {...field}
                      autoComplete="off"
                      disabled={isSettingDefault}
                      type="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. +44 123 456 7890"
                      {...field}
                      autoComplete="off"
                      disabled={isSettingDefault}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="event-outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                variant="event-primary"
                type="submit"
                disabled={isPending}
              >
                {isPending
                  ? "Saving..."
                  : isSettingDefault
                  ? "Set as Default"
                  : "Update Location"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
