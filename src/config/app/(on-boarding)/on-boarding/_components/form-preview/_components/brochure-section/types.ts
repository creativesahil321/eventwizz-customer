import { LucideIcon } from "lucide-react";

export interface LocationData {
  title: string;
  icon: LucideIcon;
  description: string;
  location_direction?: string;
}

export interface DownloadLink {
  icon?: LucideIcon;
  title: string;
  link: string;
  type?: "link" | "button";
}

export interface DownloadData {
  icon: LucideIcon;
  title: string;
  download_link: DownloadLink[];
}

export interface PriceData {
  icon: LucideIcon;
  title: string;
  description: string;
  link?: string;
  price_title?: string;
}

export interface DateSectionBox {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  links: DownloadLink[];
}

export interface DateSectionData {
  heading?: string;
  boxData: DateSectionBox[];
}
