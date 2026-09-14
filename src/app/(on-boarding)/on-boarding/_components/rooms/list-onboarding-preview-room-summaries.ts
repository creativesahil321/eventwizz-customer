import type { RoomType } from "@/app/(on-boarding)/on-boarding/_components/form-provider/schema";
import {
  lowestPositivePrice,
  pickRoomHighlights,
  resolveRoomThumbnailUrl,
  type EventRoomChooserItem,
} from "@/lib/event-room-chooser-item";
import { unnamedRoomLabel } from "@/lib/room-name-examples";

/**
 * Card summaries for the onboarding live preview "Choose Your Room" section.
 */
export function listOnboardingPreviewRoomSummaries(
  rooms: RoomType[],
  bannerFallback?: string | null,
): EventRoomChooserItem[] {
  const banner = resolveRoomThumbnailUrl(bannerFallback);

  return rooms.map((room, index) => {
    const pkg = room.package;
    const drinkPackages = room.drinks?.packages ?? [];

    const galleryUrl = (() => {
      const gallery = pkg?.gallery;
      if (!Array.isArray(gallery)) return null;
      for (const item of gallery) {
        if (typeof item === "object" && item && "url" in item) {
          const url = resolveRoomThumbnailUrl(
            (item as { url?: string }).url,
          );
          if (url) return url;
        }
      }
      return null;
    })();

    const inclusionHighlights = pickRoomHighlights(
      (pkg?.package_details ?? []).map((detail) =>
        typeof detail === "object" && detail
          ? (detail as { title?: string }).title
          : undefined,
      ),
      3,
    );
    const highlights =
      inclusionHighlights.length > 0
        ? inclusionHighlights
        : pickRoomHighlights(
            drinkPackages.map((drink) => drink.title),
            3,
          );

    return {
      room_id: Number(room.id) > 0 ? Number(room.id) : index + 1,
      name: String(room.name || "").trim() || unnamedRoomLabel(),
      index,
      thumbnail:
        resolveRoomThumbnailUrl(pkg?.package_image) || galleryUrl || banner,
      fromPrice: lowestPositivePrice(
        drinkPackages.map((drink) => drink.price),
      ),
      packageCount: drinkPackages.length,
      highlights,
    };
  });
}
