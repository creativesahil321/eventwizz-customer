"use client";

import React from "react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useForm, SubmitHandler, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LocationFormValues, locationSchema } from "../_lib/validations";
import { useCreateLocation } from "../_lib/queries";
import { slugify } from "@/lib/utils";
import { useLocationStore } from "@/store/location.store";
import GoogleLocationSearch from "@/app/(on-boarding)/on-boarding/_components/steps/step-11/google-location-search";
import { env } from "@/env";
import { fetchLocationDetails } from "@/app/(on-boarding)/on-boarding/_components/steps/step-11/_lib/actions";

export default function CreateLocationDialog() {
  const [open, setOpen] = React.useState(false);
  const { mutate: createLocation, isPending } = useCreateLocation();
  const { selectedLocation } = useLocationStore();

  // Get the venue name from the selected location or session
  const venueName = selectedLocation?.name || "Venue";

  const form = useForm({
    resolver: zodResolver(locationSchema) as Resolver<LocationFormValues>,
    defaultValues: {
      address: "",
      city: "",
      email: "",
      contact_number: "",
      is_default: false,
    },
  });

  const onSubmit: SubmitHandler<LocationFormValues> = (data) => {
    // Generate name from venue name
    const locationName = venueName;

    // Generate slug from city name if not provided
    if (!data.slug) {
      data.slug = slugify(data.city);
    }

    // Add the name to the data
    const completeData = {
      ...data,
      name: locationName,
    };

    createLocation(completeData, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="event-primary" size="sm" className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          <span>Add Location</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] text-black">
        <DialogHeader>
          <DialogTitle>Add New Location</DialogTitle>
          <DialogDescription>
            Add a new location for your venue ({venueName}). Fill in the
            location details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        fetchLocationDetails(form, placeId)
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
                      type="tel"
                      placeholder="e.g. +44 123 456 7890"
                      {...field}
                      autoComplete="off"
                      onChange={(e) => {
                        // Only allow numbers, spaces, dashes, plus signs, and parentheses
                        const value = e.target.value.replace(/[^\d\s\-+()]/g, "");
                        e.target.value = value;
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="event-outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="event-primary"
                type="submit"
                disabled={isPending}
              >
                {isPending ? "Saving..." : "Save Location"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
