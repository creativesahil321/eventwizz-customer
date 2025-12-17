import { toast } from "sonner";
import { UseFormReturn, Path, PathValue } from "react-hook-form";

// Define a generic type for forms that have the needed fields
type FormWithLocationFields = {
  address?: string;
  city?: string;
  contact_number?: string;
};

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
      // Use additional type assertion for safety
      form.setValue(
        "address" as Path<T>,
        (place.formatted_address ?? "") as unknown as PathValue<T, Path<T>>,
        { shouldValidate: true }
      );

      // Extract city from address components if available
      if (place.address_components) {
        const cityComponent = place.address_components.find(
          (component) =>
            component.types.includes("locality") ||
            component.types.includes("postal_town") ||
            component.types.includes("administrative_area_level_1")
        );

        if (cityComponent) {
          form.setValue(
            "city" as Path<T>,
            cityComponent.long_name as unknown as PathValue<T, Path<T>>,
            { shouldValidate: true }
          );
        }
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
