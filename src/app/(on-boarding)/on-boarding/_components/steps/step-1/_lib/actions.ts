import { toast } from "sonner";
import { UseFormReturn } from "react-hook-form";
import { StepOneType } from "../../../form-provider/schema";
import { cityFromGooglePlace } from "../../step-7/address-autocomplete";

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
        "geometry",
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

      const city = cityFromGooglePlace({
        address_components: place.address_components,
        formatted_address: place.formatted_address,
      });
      if (city) {
        form.setValue("city", city, {
          shouldValidate: true,
        });
      }

      const loc = place.geometry?.location;
      if (loc) {
        form.setValue("latitude", loc.lat(), {
          shouldValidate: true,
          shouldDirty: true,
        });
        form.setValue("longitude", loc.lng(), {
          shouldValidate: true,
          shouldDirty: true,
        });
      } else {
        form.setValue("latitude", undefined, { shouldValidate: true });
        form.setValue("longitude", undefined, { shouldValidate: true });
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
