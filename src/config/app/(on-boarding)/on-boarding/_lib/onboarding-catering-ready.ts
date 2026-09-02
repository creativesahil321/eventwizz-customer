import type { StepSixType } from "../_components/form-provider/schema";
import { coerceApiFlag } from "@/lib/coerce-api-boolean";

export function normalizeOnboardingCateringOption(value: unknown): 0 | 1 {
  return coerceApiFlag(
    value as boolean | number | string | null | undefined,
  );
}

export type OnboardingMenuItem = {
  title?: string;
  description?: string;
};

export type OnboardingMenu = {
  name?: string;
  items?: OnboardingMenuItem[];
};

export function isOnboardingMenuItemFilled(
  item: OnboardingMenuItem | undefined,
): boolean {
  return (
    String(item?.title ?? "").trim().length > 0 &&
    String(item?.description ?? "").trim().length > 0
  );
}

export type OnboardingMenuItemFilled = {
  title: string;
  description: string;
};

export function getFilledOnboardingMenuItems(
  items: OnboardingMenuItem[] | undefined,
): OnboardingMenuItemFilled[] {
  return (items ?? [])
    .filter(isOnboardingMenuItemFilled)
    .map((item) => ({
      title: String(item.title ?? "").trim(),
      description: String(item.description ?? "").trim(),
    }));
}

/** Drop categories with no filled items — backend rejects empty menu blocks when catering is on. */
export function sanitizeOnboardingMenusForSubmit(
  menus: OnboardingMenu[] | undefined,
): Array<{ name: string; items: OnboardingMenuItemFilled[] }> {
  return (menus ?? [])
    .map((menu) => ({
      name: String(menu.name ?? "").trim(),
      items: getFilledOnboardingMenuItems(menu.items),
    }))
    .filter((menu) => menu.name.length > 0 && menu.items.length > 0);
}

export function getOnboardingEmptyMenuCategoryNames(
  menus: OnboardingMenu[] | undefined,
): string[] {
  return (menus ?? [])
    .filter((menu) => {
      const name = String(menu.name ?? "").trim();
      if (!name) return false;
      return getFilledOnboardingMenuItems(menu.items).length === 0;
    })
    .map((menu) => String(menu.name ?? "").trim());
}

export function getOnboardingCateringValidationMessage(
  data:
    | Pick<
        StepSixType,
        | "catering_option"
        | "menu_title"
        | "menu_description"
        | "event_menu_category_id"
        | "menus"
      >
    | undefined,
): string | null {
  if (!data) return "Complete catering details for this room.";
  if (normalizeOnboardingCateringOption(data.catering_option) !== 1) {
    return null;
  }

  if (!String(data.menu_title ?? "").trim()) {
    return "Menu title is required when catering is enabled.";
  }
  if (!String(data.menu_description ?? "").trim()) {
    return "Menu description is required when catering is enabled.";
  }

  const categoryId = Number(data.event_menu_category_id);
  if (!Number.isFinite(categoryId) || categoryId < 1) {
    return "Create or select a menu category before adding menu items.";
  }

  const menus = data.menus ?? [];
  const emptyCategoryNames = getOnboardingEmptyMenuCategoryNames(menus);
  if (emptyCategoryNames.length > 0) {
    if (emptyCategoryNames.length === 1) {
      return `Add at least one item to ${emptyCategoryNames[0]}.`;
    }
    return `Add at least one item to: ${emptyCategoryNames.join(", ")}.`;
  }

  if (sanitizeOnboardingMenusForSubmit(menus).length === 0) {
    return "At least one menu category with items is required when catering is enabled.";
  }

  return null;
}

/**
 * When catering is enabled, title, description, a created menu category
 * (`event_menu_category_id`), and every menu tab must include at least one
 * filled item before the room counts as complete or can be saved.
 */
export function isOnboardingCateringRoomReady(
  data:
    | Pick<
        StepSixType,
        | "catering_option"
        | "menu_title"
        | "menu_description"
        | "event_menu_category_id"
        | "menus"
      >
    | undefined,
): boolean {
  return getOnboardingCateringValidationMessage(data) === null;
}
