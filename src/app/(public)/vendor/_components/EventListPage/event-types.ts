import { Event, GalleryImage } from "@/services/common/events/type";

export interface EventComponentProps {
  events?: Event[];
  sectionTitle?: string;
  locationSlug?: string;
}

export interface GalleryComponentProps {
  galleryImages?: GalleryImage[];
  galleryTitle?: string;
}
