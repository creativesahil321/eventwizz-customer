import { Metadata } from "next";
import { fetchServerTheme, getRequestHost } from "@/lib/server-theme";
import { appConfig } from "@/config/app";

// Define the extended theme data structure that includes SEO
interface ExtendedThemeData {
  seo?: {
    title: string;
    description: string;
    keywords: string;
  };
  // Use a more specific index signature
  [key: string]: unknown;
}

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  const themeData = await fetchServerTheme(host);

  // Cast themeData to our extended interface to fix TypeScript errors
  const extendedTheme = themeData as unknown as ExtendedThemeData;

  // Now we can safely access the seo property
  if (extendedTheme && extendedTheme.seo) {
    return {
      title: extendedTheme.seo.title,
      description: extendedTheme.seo.description,
      keywords: extendedTheme.seo.keywords,
    };
  }

  // Fallback metadata if theme API fails
  return {
    title: appConfig.seo.title,
    description: appConfig.seo.description,
    keywords: appConfig.seo.keywords,
  };
}

// Client component that determines which homepage to render
export { HomeContent as default } from "./home-content";
