import { eventsService } from "@/services/vendor/events/events.service";
import type { EventMenuCategory } from "@/services/vendor/events/type";
import { toPositiveId } from "@/lib/to-positive-id";

export type MenuNameSource = { name?: string | null };

export { toPositiveId };

/**
 * A menu category is only valid once it exists on the backend (id > 0). Menu
 * items must never be persisted as "catering enabled" without one — see
 * `stepSixSchema`. Use this everywhere the AI/apply flows decide whether a
 * catering slot can be saved.
 */
export function isValidMenuCategoryId(id: unknown): boolean {
  return toPositiveId(id) != null;
}

export function normalizeMenuCategory(
  category: EventMenuCategory | null | undefined,
): EventMenuCategory | null {
  if (!category) return null;
  const id = toPositiveId(category.id);
  const name = String(category.name ?? "").trim();
  if (id == null || !name) return null;
  return { ...category, id, name };
}

/** Menu categories are event-level — dedupe by id so the dropdown never lists duplicates. */
export function dedupeMenuCategoriesById(
  categories: EventMenuCategory[],
): EventMenuCategory[] {
  const byId = new Map<number, EventMenuCategory>();
  for (const cat of categories) {
    const normalized = normalizeMenuCategory(cat);
    if (!normalized) continue;
    if (!byId.has(normalized.id)) byId.set(normalized.id, normalized);
  }
  return Array.from(byId.values());
}

/**
 * One visible option per category name. Prefer `preferredId` when apply-to-all
 * left the same name on more than one id.
 */
export function dedupeMenuCategoriesForSelect(
  categories: EventMenuCategory[],
  preferredId?: number,
): EventMenuCategory[] {
  const uniqueById = dedupeMenuCategoriesById(categories);
  const byName = new Map<string, EventMenuCategory>();

  for (const category of uniqueById) {
    const key = category.name.trim().toLowerCase();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, category);
      continue;
    }
    if (preferredId != null && Number(category.id) === preferredId) {
      byName.set(key, category);
    }
  }

  return Array.from(byName.values());
}

export function extractMenuCategoriesList(
  response: unknown,
): EventMenuCategory[] {
  if (!response || typeof response !== "object") return [];
  let raw: EventMenuCategory[] = [];
  if (
    "data" in response &&
    Array.isArray((response as { data: unknown }).data)
  ) {
    raw = (response as { data: EventMenuCategory[] }).data;
  } else if (Array.isArray(response)) {
    raw = response as EventMenuCategory[];
  }
  return dedupeMenuCategoriesById(raw);
}

export function extractCreatedMenuCategory(
  response: unknown,
): EventMenuCategory | null {
  if (!response || typeof response !== "object") return null;
  if (
    "status" in response &&
    (response as { status?: boolean }).status &&
    "data" in response
  ) {
    return normalizeMenuCategory(
      (response as { data: EventMenuCategory }).data,
    );
  }
  if ("id" in response && "name" in response) {
    return normalizeMenuCategory({
      id: (response as { id: number }).id,
      name: (response as { name: string }).name,
    });
  }
  return null;
}

export function findMenuCategoryIdByName(
  categories: EventMenuCategory[],
  name: string | undefined,
): number | undefined {
  const key = String(name ?? "").trim().toLowerCase();
  if (!key) return undefined;
  const match = categories.find(
    (category) => String(category.name ?? "").trim().toLowerCase() === key,
  );
  return toPositiveId(match?.id);
}

/** Prefer the category whose name matches the first menu section (Starters, …). */
export function findMenuCategoryIdForMenus(
  categories: EventMenuCategory[],
  menus: MenuNameSource[] | undefined,
): number | undefined {
  const firstName = (menus ?? [])
    .map((menu) => String(menu?.name ?? "").trim().toLowerCase())
    .find((name) => name.length > 0);

  if (firstName) {
    const matchedId = findMenuCategoryIdByName(categories, firstName);
    if (matchedId != null) return matchedId;
  }

  return toPositiveId(categories[0]?.id);
}

/**
 * Manual catering creates categories via POST /vendor/event-menus/store, then saves menus.
 * With multi-room, pass room_id so categories are scoped per room.
 */
export async function ensureEventMenuCategoriesForRoom(
  eventId: number,
  roomId: number | undefined,
  menus: MenuNameSource[] | undefined,
): Promise<number | undefined> {
  const uniqueNames = [
    ...new Set(
      (menus ?? [])
        .map((menu) => String(menu?.name ?? "").trim())
        .filter((name) => name.length > 0),
    ),
  ];
  if (uniqueNames.length === 0) return undefined;

  const scopedRoomId = toPositiveId(roomId);

  let existing: EventMenuCategory[] = [];
  try {
    const response = await eventsService.getEventMenuCategories({
      event_id: eventId,
      ...(scopedRoomId != null ? { room_id: scopedRoomId } : {}),
    });
    existing = extractMenuCategoriesList(response);
  } catch (error) {
    console.warn("Failed to load menu categories before save:", error);
  }

  const byNameLower = new Map(
    existing.map((category) => [
      category.name.trim().toLowerCase(),
      category,
    ]),
  );

  for (const name of uniqueNames) {
    const key = name.toLowerCase();
    if (byNameLower.has(key)) continue;
    try {
      const response = await eventsService.createEventMenuCategory({
        vendor_event_id: eventId,
        name,
        ...(scopedRoomId != null ? { room_id: scopedRoomId } : {}),
      });
      const created = extractCreatedMenuCategory(response);
      if (created) byNameLower.set(key, created);
    } catch (error) {
      console.warn(`Failed to create menu category "${name}":`, error);
    }
  }

  const firstMenuKey = uniqueNames[0]?.toLowerCase();
  return firstMenuKey
    ? toPositiveId(byNameLower.get(firstMenuKey)?.id)
    : undefined;
}
