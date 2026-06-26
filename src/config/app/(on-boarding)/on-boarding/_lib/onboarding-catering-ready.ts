import type { StepSixType } from "../_components/form-provider/schema";

export function normalizeOnboardingCateringOption(value: unknown): 0 | 1 {
  if (value === 1 || value === "1" || value === true || value === "true") {
    return 1;
  }
  return 0;
}

/**
 * Matches onboarding `stepSixSchema`: when catering is enabled, title, description,
 * and at least one menu category with a filled item are required. Menu category
 * dropdown (`event_menu_category_id`) is optional when custom menus exist.
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
  if (!data) return false;
  if (normalizeOnboardingCateringOption(data.catering_option) !== 1) return true;
  if (!String(data.menu_title ?? "").trim()) return false;
  if (!String(data.menu_description ?? "").trim()) return false;

  const menus = data.menus ?? [];
  if (menus.length === 0) return false;

  return menus.some(
    (menu) =>
      String(menu.name ?? "").trim().length > 0 &&
      (menu.items ?? []).some(
        (item) =>
          String(item.title ?? "").trim().length > 0 &&
          String(item.description ?? "").trim().length > 0,
      ),
  );
}
