import { eventsService } from "@/services/vendor/events/events.service";
import type { EventMenuCategory } from "@/services/vendor/events/type";

export type MenuNameSource = { name?: string | null };

/** Menu categories are event-level — dedupe by id so the dropdown never lists duplicates. */
export function dedupeMenuCategoriesById(
  categories: EventMenuCategory[],
): EventMenuCategory[] {
  const byId = new Map<number, EventMenuCategory>();
  for (const cat of categories) {
    const id = Number(cat.id);
    if (!Number.isFinite(id)) continue;
    if (!byId.has(id)) byId.set(id, cat);
  }
  return Array.from(byId.values());
}

export function extractMenuCategoriesList(response: unknown): EventMenuCategory[] {
  if (!response || typeof response !== "object") return [];
  if ("data" in response && Array.isArray((response as { data: unknown }).data)) {
    return (response as { data: EventMenuCategory[] }).data;
  }
  if (Array.isArray(response)) return response as EventMenuCategory[];
  return [];
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
    const data = (response as { data: EventMenuCategory }).data;
    if (data?.id && data?.name) return data;
  }
  if ("id" in response && "name" in response) {
    return {
      id: (response as { id: number }).id,
      name: (response as { name: string }).name,
    };
  }
  return null;
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

  const scopedRoomId =
    roomId != null && roomId > 0 ? roomId : undefined;

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
  return firstMenuKey ? byNameLower.get(firstMenuKey)?.id : undefined;
}
