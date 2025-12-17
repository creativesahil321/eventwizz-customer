import { toast } from "sonner";
import { UseFormReturn } from "react-hook-form";
import { StepOneType } from "../../../form-provider/schema";

export const fetchPlaceDetails = (
  form: UseFormReturn<StepOneType>,
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
        "website",
        "url",
        "business_status",
        "address_components",
      ],
    },
    (place, status) => {
      if (
        status !== window.google.maps.places.PlacesServiceStatus.OK ||
        !place
      ) {
        toast.error("Failed to fetch business details");
        return;
      }

      // Update form values with place details
      form.setValue("name", place.name ?? "", { shouldValidate: true });
      form.setValue(
        "contact_number",
        place.international_phone_number ?? place.formatted_phone_number ?? "",
        { shouldValidate: true }
      );
      // Website URL can be used in domain field
      form.setValue("domain", place.website ?? place.url ?? "", {
        shouldValidate: true,
      });
      form.setValue("address", place.formatted_address ?? "", {
        shouldValidate: true,
      });

      // Extract city from address components if available
      if (place.address_components) {
        const cityComponent = place.address_components.find(
          (component) =>
            component.types.includes("locality") ||
            component.types.includes("postal_town") ||
            component.types.includes("administrative_area_level_1")
        );

        if (cityComponent) {
          form.setValue("city", cityComponent.long_name, {
            shouldValidate: true,
          });
        }
      }

      // Set a generic description if business is operational
      if (place.business_status === "OPERATIONAL") {
        form.setValue(
          "description",
          `${place.name} is an established venue located at ${place.formatted_address}.`,
          { shouldValidate: true }
        );
      }
    }
  );
};
