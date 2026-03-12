import { Metadata } from "next";
import { appConfig } from "@/config/app";
import { getRequestHost, fetchServerThemeCached } from "@/lib/server-theme";

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  const theme = await fetchServerThemeCached(host);

  // Both admin and vendor/customer tenants get theme from API; use layout's dynamic metadata.
  if (theme) {
    return {};
  }

  // Fallback only when API returns no theme (e.g. offline or unknown host).
  return {
    title: "Event Management",
    description: appConfig.seo.description,
    keywords: appConfig.seo.keywords,
  };
}

// Client component that determines which homepage to render
export { HomeContent as default } from "./home-content";
