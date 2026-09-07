"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
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
import { toast } from "sonner";
import { resolveVenueLocationCoords } from "@/lib/venue-location-address";

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
  const addressPlaceIdRef = useRef<string | null>(null);
  const initialAddressRef = useRef<string>(location.address || "");
  const [isAddressValid, setIsAddressValid] = useState(true);

  const existingCoords = resolveVenueLocationCoords(
    location as Location & Record<string, unknown>,
  );

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
      latitude: existingCoords?.latitude,
      longitude: existingCoords?.longitude,
    },
  });

  useEffect(() => {
    initialAddressRef.current = location.address || "";
    const coords = resolveVenueLocationCoords(
      location as Location & Record<string, unknown>,
    );
    form.reset({
      name: location.name || "",
      address: location.address || "",
      city: location.city || "",
      slug: location.slug || "",
      is_default: Boolean(location.is_default),
      contact_number: location.contact_number || "",
      email: location.email || "",
      latitude: coords?.latitude,
      longitude: coords?.longitude,
    });
    addressPlaceIdRef.current = null;
    setIsAddressValid(true);
  }, [form, location]);

  const handleAddressClear = useCallback(() => {
    form.setValue("address", "");
    form.setValue("city", "");
    form.setValue("contact_number", "");
    form.setValue("latitude", undefined);
    form.setValue("longitude", undefined);
    addressPlaceIdRef.current = null;
    setIsAddressValid(false);
  }, [form]);

  const onSubmit: SubmitHandler<LocationFormValues> = (data) => {
    const address = (data.address ?? "").trim();
    const initialAddress = initialAddressRef.current;
    const addressChanged = address !== initialAddress;

    if (address && addressChanged && !addressPlaceIdRef.current) {
      toast.error("Please select a location from the suggestions", {
        description:
          "Google didn't find that location. Type to search and choose a suggested UK address.",
        duration: 5000,
      });
      return;
    }

    if (
      data.latitude == null ||
      data.longitude == null ||
      !Number.isFinite(Number(data.latitude)) ||
      !Number.isFinite(Number(data.longitude))
    ) {
      toast.error("Missing map coordinates for this address", {
        description:
          "Select the address from Google suggestions again so we can save latitude and longitude.",
        duration: 5000,
      });
      return;
    }

    if (!data.slug) {
      data.slug = slugify(data.city);
    }

    updateLocation(
      { ...data, slug: data.slug },
      {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
          addressPlaceIdRef.current = null;
        },
      },
    );
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
              : "Update the details of this location."}
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
                  <FormLabel>
                    Address <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <GoogleLocationSearch
                      apiKey={env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                      value={field.value || ""}
                      onChange={(value: string) => {
                        field.onChange(value);
                        setIsAddressValid(false);
                      }}
                      onSelect={(placeId: string) => {
                        addressPlaceIdRef.current = placeId;
                        setIsAddressValid(true);
                        fetchLocationDetails(form, placeId);
                      }}
                      onClear={handleAddressClear}
                      placeholder="Type to search for a UK address or location..."
                      disabled={isSettingDefault}
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
                      disabled
                      className="bg-muted cursor-not-allowed opacity-80"
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
                  <FormLabel>
                    Contact Number <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="e.g. +44 123 456 7890"
                      {...field}
                      autoComplete="off"
                      disabled={isSettingDefault}
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
                disabled={isPending || !isAddressValid}
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
