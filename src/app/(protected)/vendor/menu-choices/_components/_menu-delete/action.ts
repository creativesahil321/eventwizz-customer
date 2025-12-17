"use client";

import { useDeleteMenuChoice } from "../../_lib/queries";
import { MenuChoice } from "../../_lib/types";

export const useDeleteMenuAction = () => {
  const deleteMenuMutation = useDeleteMenuChoice();

  const deleteMenu = async (menu: MenuChoice | null) => {
    if (!menu || !menu.id) {
      return {
        error: "Menu information is missing or invalid",
        success: false,
      };
    }

    try {
      const response = await deleteMenuMutation.mutateAsync(menu.id);
      return {
        success: response.status,
        message: response.message,
      };
    } catch {
      // The error will be handled by the API interceptors
      return {
        error: "Failed to delete menu",
        success: false,
      };
    }
  };

  return { deleteMenu, isDeleting: deleteMenuMutation.isPending };
};
