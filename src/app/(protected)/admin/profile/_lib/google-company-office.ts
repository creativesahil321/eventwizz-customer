import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import type { AdminProfileFormValues } from "./company-info-schema";

export function fetchCompanyOfficeDetails(
  form: UseFormReturn<AdminProfileFormValues>,
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
      fields: ["formatted_address", "international_phone_number", "formatted_phone_number"],
    },
    (place, status) => {
      if (
        status !== window.google.maps.places.PlacesServiceStatus.OK ||
        !place
      ) {
        toast.error("Failed to fetch location details");
        return;
      }

      if (place.formatted_address) {
        form.setValue("company_registered_office", place.formatted_address, {
          shouldValidate: true,
        });
      }

      const phone =
        place.international_phone_number ?? place.formatted_phone_number;
      if (phone) {
        form.setValue("company_phone", phone, { shouldValidate: true });
      }
    },
  );
}
