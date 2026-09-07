import { toast } from "sonner";
import { UseFormReturn, Path, PathValue } from "react-hook-form";

// Define a generic type for forms that have the needed fields
type FormWithLocationFields = {
  address?: string;
  city?: string;
  contact_number?: string;
  latitude?: number;
  longitude?: number;
};

export type LocationCoordinates = {
  latitude: number;
  longitude: number;
};

export const geocodeLocation = async (
  address: string,
  city?: string,
): Promise<LocationCoordinates | null> => {
  if (!window.google?.maps?.Geocoder || !address.trim()) return null;

  const query = [address.trim(), city?.trim()].filter(Boolean).join(", ");
  try {
    const { results } = await new window.google.maps.Geocoder().geocode({
      address: query,
      region: "uk",
    });
    const location = results[0]?.geometry?.location;
    if (!location) return null;

    return {
      latitude: location.lat(),
      longitude: location.lng(),
    };
  } catch {
    return null;
  }
};

export function extractCityFromPlace(
  place: google.maps.places.PlaceResult,
): string {
  if (place.address_components?.length) {
    const pick = (...types: string[]) =>
      place.address_components?.find((c) =>
        types.some((t) => c.types.includes(t)),
      )?.long_name;

    const city =
      pick("postal_town", "locality") ||
      pick("sublocality_level_1", "sublocality") ||
      pick("administrative_area_level_2") ||
      pick("administrative_area_level_1");
    if (city?.trim()) return city.trim();
  }

  if (place.formatted_address) {
    const UK_POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi;
    const US_ZIP = /\b\d{5}(?:-\d{4})?\b/g;
    const parts = place.formatted_address
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const withoutCountry = parts.slice(0, -1);
      for (let i = withoutCountry.length - 1; i >= 0; i--) {
        const candidate = withoutCountry[i]
          .replace(UK_POSTCODE, "")
          .replace(US_ZIP, "")
          .trim()
          .replace(/^[-,]+|[-,]+$/g, "")
          .trim();
        if (candidate.length >= 2 && !/^\d+$/.test(candidate)) {
          return candidate;
        }
      }
    }
  }
  return "";
}

export const fetchLocationDetails = <T extends FormWithLocationFields>(
  form: UseFormReturn<T>,
  placeId: string
) => {
  if (!window.google?.maps?.places?.PlacesService) {
    toast.error("Google Maps API not loaded or incomplete");
    return;
  }

  const service = new window.google.maps.places.PlacesService(
    document.createElement("div")
  );

  service.getDetails(
    {
      placeId,
      fields: [
        "name",
        "formatted_address",
        "formatted_phone_number",
        "international_phone_number",
        "address_components",
        "geometry",
      ],
    },
    (place, status) => {
      if (
        status !== window.google.maps.places.PlacesServiceStatus.OK ||
        !place
      ) {
        toast.error("Failed to fetch location details");
        return;
      }

      // Update form values with place details using type assertion for safety
      form.setValue(
        "address" as Path<T>,
        (place.formatted_address ?? "") as unknown as PathValue<T, Path<T>>,
        { shouldValidate: true, shouldDirty: true }
      );

      // Robustly extract city from address components or formatted address
      const resolvedCity = extractCityFromPlace(place);
      if (resolvedCity) {
        form.setValue(
          "city" as Path<T>,
          resolvedCity as unknown as PathValue<T, Path<T>>,
          { shouldValidate: true, shouldDirty: true }
        );
      }

      // Pin for venue location create/update payloads
      const loc = place.geometry?.location;
      if (loc) {
        form.setValue(
          "latitude" as Path<T>,
          loc.lat() as unknown as PathValue<T, Path<T>>,
          { shouldValidate: true, shouldDirty: true },
        );
        form.setValue(
          "longitude" as Path<T>,
          loc.lng() as unknown as PathValue<T, Path<T>>,
          { shouldValidate: true, shouldDirty: true },
        );
      }

      // Set contact number if available
      if (place.international_phone_number || place.formatted_phone_number) {
        const phoneNumber =
          place.international_phone_number ??
          place.formatted_phone_number ??
          "";
        form.setValue(
          "contact_number" as Path<T>,
          phoneNumber as unknown as PathValue<T, Path<T>>,
          { shouldValidate: true }
        );
      }
    }
  );
};
