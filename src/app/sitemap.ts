import { appConfig } from "@/config/app";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [""].map((route) => ({
    url: `${appConfig.url}${route}`,
    lastModified: new Date().toISOString(),
  }));

  return [...routes];
}
