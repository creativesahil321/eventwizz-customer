import { appConfig } from "@/config/app";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${appConfig.url}/sitemap.xml`,
  };
}
