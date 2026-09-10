import type { RoomType } from "../_components/form-provider/schema";
import { sortMenusForOnboardingDisplay } from "@/lib/event-menu-categories";
import { resolveDrinksOptionFlag } from "@/app/(protected)/vendor/events/_lib/vendor-step-six-rooms";

/** Brochure fields copied to every room on "Apply to all" (matches vendor dashboard). */
export function cloneOnboardingBrochureForApplyAll(
  source: Record<string, unknown>,
): NonNullable<RoomType["brochure"]> {
  const pdfValue = (key: "brochure_pdf" | "brochure_pdf_2" | "faq_pdf") => {
    const value = source[key];
    if (value instanceof File) return value;
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
    return null;
  };

  return {
    brochure_pdf: pdfValue("brochure_pdf"),
    brochure_pdf_2: pdfValue("brochure_pdf_2"),
    faq_pdf: pdfValue("faq_pdf"),
    remove_brochure_pdf: Boolean(source.remove_brochure_pdf),
    remove_brochure_pdf_2: Boolean(source.remove_brochure_pdf_2),
    remove_faq_pdf: Boolean(source.remove_faq_pdf),
    price_start_from:
      typeof source.price_start_from === "string" ? source.price_start_from : "",
    downloads: Array.isArray(source.downloads) ? source.downloads : [],
    more_info: Array.isArray(source.more_info) ? source.more_info : [],
  };
}

type MenuItemLike = { title?: string; description?: string };
type MenuLike = { name?: string; items?: MenuItemLike[] };

/** Catering/menu fields copied to every room on "Apply to all" (matches vendor dashboard). */
export function cloneOnboardingCateringForApplyAll(
  source: Record<string, unknown>,
): NonNullable<RoomType["catering"]> {
  const cateringOption = Number(source.catering_option ?? 0) === 1 ? 1 : 0;

  if (cateringOption !== 1) {
    return {
      catering_option: 0,
      menu_title: "",
      menu_description: "",
      event_menu_category_id: 0,
      menus: [],
    };
  }

  const menus = Array.isArray(source.menus) ? (source.menus as MenuLike[]) : [];

  return {
    catering_option: 1,
    menu_title: String(source.menu_title ?? ""),
    menu_description: String(source.menu_description ?? ""),
    event_menu_category_id: Number(source.event_menu_category_id) || 0,
    menus: sortMenusForOnboardingDisplay(
      menus.map((menu) => ({
        name: String(menu.name ?? ""),
        items: (menu.items ?? []).map((item) => ({
          title: String(item.title ?? ""),
          description: String(item.description ?? ""),
        })),
      })),
    ),
  };
}

/** Dates copied to every room on "Apply to all" (matches vendor dates tab). */
export function cloneOnboardingDatesForApplyAll(
  source: Record<string, unknown>,
): RoomType["dates"] {
  const dates = Array.isArray(source.dates) ? source.dates : [];
  return JSON.parse(JSON.stringify({ dates })) as RoomType["dates"];
}

/** Drinks fields copied to every room on "Apply to all". */
export function cloneOnboardingDrinksForApplyAll(
  source: Record<string, unknown>,
): NonNullable<RoomType["drinks"]> {
  const packages = Array.isArray(source.packages) ? source.packages : [];

  return {
    drinks_option: resolveDrinksOptionFlag(source),
    drink_title: String(source.drink_title ?? ""),
    drink_description: String(source.drink_description ?? ""),
    packages: packages.map((pkg) => {
      const p = (pkg ?? {}) as Record<string, unknown>;
      return {
        title: String(p.title ?? ""),
        description: String(p.description ?? ""),
        price: p.price as number | string,
        available_quantity: p.available_quantity as number | string,
      };
    }),
  };
}

/**
 * Rooms array sent to onboarding step APIs (5–8 multi-room).
 * Matches vendor event editor: one room on "Apply to this room only", all on "Apply to all".
 */
export function selectOnboardingRoomsForApi(
  rooms: RoomType[],
  currentRoomIndex: number,
  applyToAllRooms: boolean,
): RoomType[] {
  const withIds = rooms.filter(
    (room) => Number.isFinite(Number(room?.id)) && Number(room.id) > 0,
  );

  if (applyToAllRooms) {
    return withIds;
  }

  const active = rooms[currentRoomIndex];
  if (!active?.id) {
    return [];
  }

  return [active];
}
