import { Event, GalleryImage } from "@/services/common/events/type";

export interface EventComponentProps {
  events?: Event[];
  sectionTitle?: string;
  locationSlug?: string;
  /** City / venue label for cards (optional MapPin row) */
  locationLabel?: string | null;
}

export interface GalleryComponentProps {
  // Support both formats: array of strings (URLs) or array of objects with {id, url}
  galleryImages?: GalleryImage[] | string[];
  galleryTitle?: string;
}
