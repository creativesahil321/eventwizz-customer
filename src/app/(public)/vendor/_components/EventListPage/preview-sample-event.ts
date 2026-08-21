import type { LocationEventCardModel } from "./location-event-card";

export const PREVIEW_SAMPLE_EVENT_IMAGES = [
  "/assets/images/events/dummyEvents/concert-event.jpg",
  "/assets/images/events/dummyEvents/theater-event.jpg",
  "/assets/images/events/dummyEvents/music-event.jpg",
] as const;

/** One polished sample card — matches live `LocationEventCard` / hero layout. */
export function buildPreviewSampleEventCard(
  formatPrice: (amount: number) => string,
): LocationEventCardModel {
  return {
    title: "Live Music Night",
    category: "Concerts",
    slug: "preview-sample-event",
    image: PREVIEW_SAMPLE_EVENT_IMAGES[1],
    price: `From ${formatPrice(28)}`,
    dateLabel: "Sat 20 Jun 2026",
    timeLabel: "19:00 – 22:00",
  };
}
