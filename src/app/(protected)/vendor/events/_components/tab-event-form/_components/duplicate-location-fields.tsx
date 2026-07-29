"use client";

import React, { useEffect, useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { env } from "@/env";
import GoogleLocationSearch from "@/app/(on-boarding)/on-boarding/_components/steps/step-11/google-location-search";
import { fetchLocationDetails } from "@/app/(on-boarding)/on-boarding/_components/steps/step-11/_lib/actions";
import {
  useCurrentLocationId,
  useVendorLocationsList,
} from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { VenueLocation } from "@/types/api.types";
import { StepEightType } from "../schema";

type DuplicateLocationFieldsProps = {
  form: UseFormReturn<StepEightType>;
  eventLocationId?: number | null;
  onFieldFocus?: (fieldName: string) => void;
  readOnly?: boolean;
};

function formatLocationOptionLabel(location: VenueLocation): string {
  return location.city?.trim() || location.name?.trim() || `Location ${location.id}`;
}

function applyExistingLocation(
  form: UseFormReturn<StepEightType>,
  location: VenueLocation,
) {
  form.setValue("vendor_location_id", location.id, { shouldValidate: true });
  form.setValue("address", location.address?.trim() || location.name?.trim() || "", {
    shouldValidate: true,
  });
  form.setValue("city", location.city?.trim() || "", { shouldValidate: true });
  form.setValue("contact_number", location.contact_number?.trim() || "", {
    shouldValidate: true,
  });
}

function clearExistingLocation(form: UseFormReturn<StepEightType>) {
  form.setValue("vendor_location_id", undefined, { shouldValidate: true });
  form.setValue("address", "", { shouldValidate: true });
  form.setValue("city", "", { shouldValidate: true });
  form.setValue("contact_number", "", { shouldValidate: true });
}

export function DuplicateLocationFields({
  form,
  eventLocationId,
  onFieldFocus,
  readOnly = false,
}: DuplicateLocationFieldsProps) {
  const { locations, isLoading } = useVendorLocationsList();
  const sessionLocationId = useCurrentLocationId();
  const duplicateTargetType = form.watch("duplicate_target_type") || "new";
  const selectedLocationId = form.watch("vendor_location_id");

  const sourceLocationId = eventLocationId ?? sessionLocationId;

  const availableLocations = useMemo(
    () =>
      locations.filter(
        (location) =>
          location.status !== false &&
          location.id !== sourceLocationId &&
          location.id > 0,
      ),
    [locations, sourceLocationId],
  );

  const hasExistingLocations = availableLocations.length > 0;

  useEffect(() => {
    if (!hasExistingLocations) {
      if (form.getValues("duplicate_target_type") !== "new") {
        form.setValue("duplicate_target_type", "new");
      }
      return;
    }

    if (!form.getValues("duplicate_target_type")) {
      form.setValue("duplicate_target_type", "existing");
    }
  }, [form, hasExistingLocations]);

  useEffect(() => {
    if (duplicateTargetType !== "existing" || selectedLocationId) {
      return;
    }

    const firstLocation = availableLocations[0];
    if (firstLocation) {
      applyExistingLocation(form, firstLocation);
    }
  }, [
    availableLocations,
    duplicateTargetType,
    form,
    selectedLocationId,
  ]);

  const handleTargetTypeChange = (value: "existing" | "new") => {
    form.setValue("duplicate_target_type", value, { shouldValidate: true });

    if (value === "existing") {
      const currentId = form.getValues("vendor_location_id");
      const selected =
        availableLocations.find((location) => location.id === currentId) ||
        availableLocations[0];

      if (selected) {
        applyExistingLocation(form, selected);
      }
      return;
    }

    clearExistingLocation(form);
  };

  const handleExistingLocationChange = (value: string) => {
    const locationId = Number(value);
    const selected = availableLocations.find(
      (location) => location.id === locationId,
    );

    if (selected) {
      applyExistingLocation(form, selected);
    }
  };

  const handleNewLocationSelect = (placeId: string) => {
    form.setValue("vendor_location_id", undefined, { shouldValidate: true });
    fetchLocationDetails(form, placeId);
  };

  return (
    <div className="space-y-6">
      {hasExistingLocations && (
        <FormField
          control={form.control}
          name="duplicate_target_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                Where should this duplicate go?
              </FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) =>
                    handleTargetTypeChange(value as "existing" | "new")
                  }
                  value={field.value || "existing"}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="existing" disabled={readOnly} />
                    </FormControl>
                    <FormLabel className="font-normal">
                      An existing location
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="new" disabled={readOnly} />
                    </FormControl>
                    <FormLabel className="font-normal">
                      A new location
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {duplicateTargetType === "existing" && hasExistingLocations ? (
        <FormField
          control={form.control}
          name="vendor_location_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                Select location <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={handleExistingLocationChange}
                  disabled={readOnly || isLoading}
                >
                  <SelectTrigger className="w-full h-11 bg-[#F9FAFB] border-[#E5E7EB]">
                    <SelectValue
                      placeholder={
                        isLoading
                          ? "Loading locations..."
                          : "Select an existing location"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLocations.map((location) => (
                      <SelectItem key={location.id} value={String(location.id)}>
                        {formatLocationOptionLabel(location)}
                        {location.is_headquarters ? " (Head office)" : ""}
                        {location.is_default ? " (In use)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <>
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  Address <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <GoogleLocationSearch
                    apiKey={env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                    value={field.value || ""}
                    onChange={(value) => {
                      form.setValue("vendor_location_id", undefined, {
                        shouldValidate: true,
                      });
                      field.onChange(value);
                    }}
                    onSelect={handleNewLocationSelect}
                    placeholder="Search for a location..."
                    disabled={readOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    City <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter city name"
                      className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                      onFocus={() => onFieldFocus?.("city")}
                      disabled={readOnly}
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
                  <FormLabel className="text-sm font-medium">
                    Contact Number <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter contact number"
                      className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                      onFocus={() => onFieldFocus?.("contact_number")}
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </>
      )}
    </div>
  );
}
