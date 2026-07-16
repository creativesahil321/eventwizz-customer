import type { MenuCategory } from "@/services/customer/bookings/type";

export function getMenuCategorySelectionKey(
  category: MenuCategory,
  index: number,
): string {
  if (category.id != null && Number.isFinite(Number(category.id))) {
    return String(category.id);
  }
  return `${category.title}::${index}`;
}

export function findMenuCategoryBySelectionKey(
  key: string,
  categories: MenuCategory[],
): MenuCategory | undefined {
  const byId = categories.find(
    (category) => category.id != null && String(category.id) === key,
  );
  if (byId) return byId;

  const titledMatch = /^(.+)::(\d+)$/.exec(key);
  if (titledMatch) {
    const title = titledMatch[1];
    const index = Number.parseInt(titledMatch[2], 10);
    const withItems = categories.filter((category) => category.items.length > 0);
    const sameTitle = withItems.filter((category) => category.title === title);
    return sameTitle[index];
  }

  return categories.find((category) => category.title === key);
}

export function persistedSelectionsToFormSelections(
  persisted: Record<string, string>,
  categories: MenuCategory[],
): Record<string, string> {
  const withItems = categories.filter((category) => category.items.length > 0);
  const result: Record<string, string> = {};
  const consumedTitles = new Set<string>();

  withItems.forEach((category, index) => {
    const formKey = getMenuCategorySelectionKey(category, index);

    if (persisted[formKey] != null) {
      result[formKey] = persisted[formKey];
      return;
    }

    if (
      persisted[category.title] != null &&
      !consumedTitles.has(category.title)
    ) {
      result[formKey] = persisted[category.title];
      consumedTitles.add(category.title);
    }
  });

  return result;
}

export function formSelectionsToChoicesArray(
  selections: Record<string, string>,
  categories: MenuCategory[],
): Array<{ event_menu_id: number; menu_item_id: number }> {
  const choices: Array<{ event_menu_id: number; menu_item_id: number }> = [];

  Object.entries(selections).forEach(([key, itemId]) => {
    const category = findMenuCategoryBySelectionKey(key, categories);
    if (!category?.id || !itemId) return;

    const menuItemId = Number.parseInt(itemId, 10);
    if (!Number.isFinite(menuItemId) || menuItemId <= 0) return;

    choices.push({
      event_menu_id: category.id,
      menu_item_id: menuItemId,
    });
  });

  return choices;
}
