import type { StepSixType } from "../_components/form-provider/schema";
import { coerceApiFlag } from "@/lib/coerce-api-boolean";

export function normalizeOnboardingCateringOption(value: unknown): 0 | 1 {
  return coerceApiFlag(
    value as boolean | number | string | null | undefined,
  );
}

/**
 * Matches onboarding `stepSixSchema`: when catering is enabled, title, description,
 * a created menu category (`event_menu_category_id`), and at least one menu with a
 * filled item are all required. The category must exist on the backend before any
 * menu items can be saved.
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

  const categoryId = Number(data.event_menu_category_id);
  if (!Number.isFinite(categoryId) || categoryId < 1) return false;

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
