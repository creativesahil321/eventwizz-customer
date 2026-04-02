"use client";

import React, { useRef, useState } from "react";
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
import { PermissionGuard } from "@/components/permission/PermissionGuard";
import { useForm, SubmitHandler, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LocationFormValues, locationSchema } from "../_lib/validations";
import { useCreateLocation } from "../_lib/queries";
import { slugify } from "@/lib/utils";
import { useSession } from "next-auth/react";
import GoogleLocationSearch from "@/app/(on-boarding)/on-boarding/_components/steps/step-11/google-location-search";
import { env } from "@/env";
import { fetchLocationDetails } from "@/app/(on-boarding)/on-boarding/_components/steps/step-11/_lib/actions";
import { toast } from "sonner";

export default function CreateLocationDialog() {
  const [open, setOpen] = React.useState(false);
  const [isAddressValid, setIsAddressValid] = useState(false);
  const addressPlaceIdRef = useRef<string | null>(null);
  const { mutate: createLocation, isPending } = useCreateLocation();
  const { data: session } = useSession();

  const venueName = session?.user?.name || "Venue";

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

  const handleAddressClear = React.useCallback(() => {
    form.setValue("address", "");
    form.setValue("city", "");
    form.setValue("contact_number", "");
    addressPlaceIdRef.current = null;
    setIsAddressValid(false);
  }, [form]);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) {
        addressPlaceIdRef.current = null;
        setIsAddressValid(false);
        form.reset({
          address: "",
          city: "",
          email: "",
          contact_number: "",
          is_default: false,
        });
      }
    },
    [form],
  );

  const onSubmit: SubmitHandler<LocationFormValues> = (data) => {
    const address = (data.address ?? "").trim();
    if (address && !addressPlaceIdRef.current) {
      toast.error("Please select a location from the suggestions", {
        description:
          "Google didn't find that location. Type to search and choose a suggested UK address.",
        duration: 5000,
      });
      return;
    }

    const locationName = venueName;
    if (!data.slug) {
      data.slug = slugify(data.city);
    }

    const completeData = {
      ...data,
      name: locationName,
    };

    createLocation(completeData, {
      onSuccess: () => {
        form.reset();
        handleOpenChange(false);
      },
    });
  };

  return (
    <PermissionGuard permissionKey="create-event-location" fallback={null}>
      <Dialog open={open} onOpenChange={handleOpenChange}>
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
                    <FormLabel>
                      Address <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <GoogleLocationSearch
                        apiKey={env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                        value={field.value || ""}
                        onChange={(value) => {
                          field.onChange(value);
                          setIsAddressValid(false);
                        }}
                        onSelect={(placeId) => {
                          addressPlaceIdRef.current = placeId;
                          setIsAddressValid(true);
                          fetchLocationDetails(form, placeId);
                        }}
                        onClear={handleAddressClear}
                        placeholder="Type to search for a UK address or location..."
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
                    <FormLabel>
                      City <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Select an address above to auto-fill"
                        {...field}
                        autoComplete="off"
                        readOnly
                        className="bg-muted cursor-not-allowed"
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
                    <FormLabel>
                      Email{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </FormLabel>
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
                    <FormLabel>
                      Contact Number <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="e.g. +44 123 456 7890"
                        {...field}
                        autoComplete="off"
                        onChange={(e) => {
                          // Only allow numbers, spaces, dashes, plus signs, and parentheses
                          const value = e.target.value.replace(
                            /[^\d\s\-+()]/g,
                            "",
                          );
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
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="event-primary"
                  type="submit"
                  disabled={isPending || !isAddressValid}
                >
                  {isPending ? "Saving..." : "Save Location"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}
