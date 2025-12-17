"use client";

import { useCreateMenuChoice } from "../../_lib/queries";
import { MenuChoiceType } from "./schema";
import { MenuChoiceCreateResponse } from "@/services/vendor/menu_choices";

/**
 * Client-side hook to create a new menu choice using TanStack Query
 * This replaces the server action with client-side mutation
 */
export const useCreateMenuAction = () => {
  const createMenuMutation = useCreateMenuChoice();

  const createMenu = async (data: MenuChoiceType): Promise<boolean> => {
    try {
      // Transform the form data into the API payload format
      const apiPayload = {
        vendor_event_id: data.event_id, // Map event_id to vendor_event_id
        event_menu_id: data.category_id, // Map category_id to event_menu_id
        title: data.menu_name, // Map menu_name to title
        description: data.description || undefined,
        status: data.status ? 1 : 0, // Convert boolean to number (1/0)
      };

      // Call the mutation and wait for the result
      const result = (await createMenuMutation.mutateAsync(
        apiPayload
      )) as MenuChoiceCreateResponse;

      // Check for success in the API response
      if (result.status === true) {
        return true;
      } else {
        console.error("API returned error:", result);
        return false;
      }
    } catch (error) {
      console.error("Error creating menu:", error);
      return false;
    }
  };

  return {
    createMenu,
    isLoading: createMenuMutation.isPending,
    error: createMenuMutation.error,
  };
};
