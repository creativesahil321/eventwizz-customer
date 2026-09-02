import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import type { ProfileFormValues } from "./types";

export function fetchProfileAddressDetails(
  form: UseFormReturn<ProfileFormValues>,
  placeId: string,
) {
  if (!window.google?.maps?.places?.PlacesService) {
    toast.error("Google Maps API not loaded or incomplete");
    return;
  }

  const service = new window.google.maps.places.PlacesService(
    document.createElement("div"),
  );

  service.getDetails(
    {
      placeId,
      fields: ["formatted_address", "address_components"],
    },
    (place, status) => {
      if (
        status !== window.google.maps.places.PlacesServiceStatus.OK ||
        !place
      ) {
        toast.error("Failed to fetch location details");
        return;
      }

      form.setValue("address", place.formatted_address ?? "", {
        shouldValidate: true,
      });

      if (!place.address_components) return;

      const cityComponent = place.address_components.find(
        (component) =>
          component.types.includes("locality") ||
          component.types.includes("postal_town") ||
          component.types.includes("administrative_area_level_1"),
      );

      if (cityComponent) {
        form.setValue("city", cityComponent.long_name, { shouldValidate: true });
      }

      const postcodeComponent = place.address_components.find((component) =>
        component.types.includes("postal_code"),
      );

      if (postcodeComponent) {
        form.setValue("postcode", postcodeComponent.long_name, {
          shouldValidate: true,
        });
      }
    },
  );
}
