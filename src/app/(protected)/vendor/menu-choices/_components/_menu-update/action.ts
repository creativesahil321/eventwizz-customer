import { MenuChoiceType } from "./schema";
import { menuChoicesService } from "@/services/vendor/menu_choices";

export const updateMenu = async (menu: MenuChoiceType): Promise<boolean> => {
  try {
    // Convert form values to API-expected structure
    // The API expects specific field names - title instead of menu_name,
    // and vendor_event_id instead of event_id
    const payload = {
      title: menu.menu_name,
      category_id: menu.category_id,
      vendor_event_id: menu.event_id,
      description: menu.description || "",
      // Status should be "active" or "inactive" string as expected by the API
      status: menu.status ? "active" : "inactive",
    };

    // Call API to update menu choice
    const response = await menuChoicesService.updateMenuChoice(
      menu.id,
      payload
    );

    // Return success status
    return response.status === true;
  } catch (error) {
    console.error("Error updating menu:", error);
  }
};
