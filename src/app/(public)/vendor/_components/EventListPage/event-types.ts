import { Event, GalleryImage } from "@/services/common/events/type";

export interface EventComponentProps {
  events?: Event[];
  sectionTitle?: string;
  locationSlug?: string;
}

export interface GalleryComponentProps {
  // Support both formats: array of strings (URLs) or array of objects with {id, url}
  galleryImages?: GalleryImage[] | string[];
  galleryTitle?: string;
}
