/**
 * Utility functions for Menu Choices System
 */

import { MenuBooking, MenuBookingDate, TableInfo } from "./types";
import { MenuCategory } from "@/services/customer/bookings/type";

/**
 * Get booking date information by date key
 * @param bookingData - The booking data
 * @param dateKey - The date key to find
 * @returns The booking date info or undefined
 */
export const getBookingDateInfo = (
  bookingData: MenuBooking,
  dateKey: string
): MenuBookingDate | undefined => {
  return bookingData.dates.find((d) => d.date_key === dateKey);
};

/**
 * Get table information by date key and table ID
 * @param bookingData - The booking data
 * @param dateKey - The date key
 * @param tableId - The table ID
 * @returns The table info or undefined
 */
export const getTableInfo = (
  bookingData: MenuBooking,
  dateKey: string,
  tableId: string
): TableInfo | undefined => {
  const dateInfo = getBookingDateInfo(bookingData, dateKey);
  return dateInfo?.tables.find((t) => t.table_id === tableId);
};

/**
 * Extract category order (titles) from menu items
 * @param menuItems - Array of menu categories
 * @returns Array of category titles in order
 */
export const getCategoryOrder = (menuItems: MenuCategory[]): string[] => {
  return menuItems.map((cat) => cat.title);
};

/**
 * Map menu selections to legacy fields (starter, mainCourse, dessert, sides)
 * @param menuSelections - Dynamic menu selections object
 * @param categoryOrder - Array of category titles in order
 * @returns Object with legacy fields
 */
export const mapMenuSelectionsToLegacy = (
  menuSelections: Record<string, string>,
  categoryOrder: string[]
): {
  starter: string;
  mainCourse: string;
  dessert: string;
  sides?: string;
} => {
  return {
    starter: categoryOrder[0] ? menuSelections[categoryOrder[0]] || "" : "",
    mainCourse: categoryOrder[1] ? menuSelections[categoryOrder[1]] || "" : "",
    dessert: categoryOrder[2] ? menuSelections[categoryOrder[2]] || "" : "",
    sides: categoryOrder[3] ? menuSelections[categoryOrder[3]] : undefined,
  };
};

/**
 * Map legacy fields to menu selections for backward compatibility
 * @param legacyFields - Object with legacy fields
 * @param categoryOrder - Array of category titles in order
 * @param existingMenuSelections - Existing menu selections to merge with
 * @returns Updated menu selections object
 */
export const mapLegacyToMenuSelections = (
  legacyFields: {
    starter?: string;
    mainCourse?: string;
    dessert?: string;
    sides?: string;
  },
  categoryOrder: string[],
  existingMenuSelections: Record<string, string> = {}
): Record<string, string> => {
  const menuSelections = { ...existingMenuSelections };

  if (
    legacyFields.starter &&
    categoryOrder[0] &&
    !menuSelections[categoryOrder[0]]
  ) {
    menuSelections[categoryOrder[0]] = legacyFields.starter;
  }
  if (
    legacyFields.mainCourse &&
    categoryOrder[1] &&
    !menuSelections[categoryOrder[1]]
  ) {
    menuSelections[categoryOrder[1]] = legacyFields.mainCourse;
  }
  if (
    legacyFields.dessert &&
    categoryOrder[2] &&
    !menuSelections[categoryOrder[2]]
  ) {
    menuSelections[categoryOrder[2]] = legacyFields.dessert;
  }
  if (
    legacyFields.sides &&
    categoryOrder[3] &&
    !menuSelections[categoryOrder[3]]
  ) {
    menuSelections[categoryOrder[3]] = legacyFields.sides;
  }

  return menuSelections;
};

/**
 * Map menu selections to API format (starter_id, main_course_id, etc.)
 * @param menuSelections - Dynamic menu selections object
 * @param categoryOrder - Array of category titles in order
 * @param fallbackLegacy - Fallback legacy fields if menuSelections don't have values
 * @returns Object with API field IDs
 */
export const mapMenuSelectionsToApiFormat = (
  menuSelections: Record<string, string>,
  categoryOrder: string[],
  fallbackLegacy?: {
    starter?: string;
    mainCourse?: string;
    dessert?: string;
    sides?: string;
  }
): {
  starter_id: number;
  main_course_id: number;
  dessert_id: number;
  sides_id?: number;
} => {
  let starter_id = 0;
  let main_course_id = 0;
  let dessert_id = 0;
  let sides_id: number | undefined = undefined;

  if (categoryOrder.length > 0 && menuSelections[categoryOrder[0]]) {
    starter_id = Number.parseInt(menuSelections[categoryOrder[0]]) || 0;
  } else if (fallbackLegacy?.starter) {
    starter_id = Number.parseInt(fallbackLegacy.starter) || 0;
  }

  if (categoryOrder.length > 1 && menuSelections[categoryOrder[1]]) {
    main_course_id = Number.parseInt(menuSelections[categoryOrder[1]]) || 0;
  } else if (fallbackLegacy?.mainCourse) {
    main_course_id = Number.parseInt(fallbackLegacy.mainCourse) || 0;
  }

  if (categoryOrder.length > 2 && menuSelections[categoryOrder[2]]) {
    dessert_id = Number.parseInt(menuSelections[categoryOrder[2]]) || 0;
  } else if (fallbackLegacy?.dessert) {
    dessert_id = Number.parseInt(fallbackLegacy.dessert) || 0;
  }

  if (categoryOrder.length > 3 && menuSelections[categoryOrder[3]]) {
    sides_id = Number.parseInt(menuSelections[categoryOrder[3]]);
  } else if (fallbackLegacy?.sides) {
    sides_id = Number.parseInt(fallbackLegacy.sides);
  }

  return {
    starter_id,
    main_course_id,
    dessert_id,
    sides_id,
  };
};

/**
 * Parse table ID from string, handling various formats
 * @param tableIdString - Table ID as string (e.g., "1", "table-1", "table-12-0")
 * @param tablesFromApi - Optional array of tables from API to match against
 * @returns Parsed table ID number, or 0 if parsing fails
 */
export const parseTableId = (
  tableIdString: string,
  tablesFromApi?: Array<{ id: number }>
): number => {
  if (tablesFromApi) {
    const tableFromApi = tablesFromApi.find(
      (t) =>
        t.id.toString() === tableIdString || `table-${t.id}` === tableIdString
    );
    if (tableFromApi) {
      return tableFromApi.id;
    }
  }

  // Try parsing after removing "table-" prefix
  const parsed = Number.parseInt(tableIdString.replaceAll("table-", ""));
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  // Try direct parsing
  const directParsed = Number.parseInt(tableIdString);
  return Number.isNaN(directParsed) ? 0 : directParsed;
};

/**
 * Transform menu selections to choices array format
 * New format: choices array with event_menu_id and menu_item_id
 * 
 * @param menuSelections - Dynamic menu selections object (category title -> item ID)
 * @param menuCategories - Array of menu categories with IDs
 * @returns Array of choices with event_menu_id and menu_item_id
 */
export const mapMenuSelectionsToChoicesArray = (
  menuSelections: Record<string, string>,
  menuCategories: MenuCategory[]
): Array<{ event_menu_id: number; menu_item_id: number }> => {
  const choices: Array<{ event_menu_id: number; menu_item_id: number }> = [];

  // Iterate through menu selections and find matching categories
  Object.entries(menuSelections).forEach(([categoryTitle, itemId]) => {
    // Find the category by title
    const category = menuCategories.find((cat) => cat.title === categoryTitle);
    
    if (category && category.id && itemId) {
      const menuItemId = Number.parseInt(itemId);
      
      // Only add if both IDs are valid
      if (!Number.isNaN(menuItemId) && menuItemId > 0) {
        choices.push({
          event_menu_id: category.id,
          menu_item_id: menuItemId,
        });
      }
    }
  });

  return choices;
};