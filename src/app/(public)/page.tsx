import { Metadata } from "next";
import { appConfig } from "@/config/app";
import { QueryClient, dehydrate } from "@tanstack/react-query";
import {
  getRequestHost,
  fetchServerThemeCached,
  getSubdomainFromDomain,
} from "@/lib/server-theme";
import { fetchPublishedBlogs } from "@/lib/blogs/public-api";
import { BLOG_HOME_PER_PAGE } from "@/lib/blogs";
import { resolveAdminHomeContent } from "@/lib/admin-cms-content";
import type { ThemeSchema } from "@/types/theme.types";
import { Hydrate } from "./[locationSlug]/_components/hydration-provider";
import { HomeContent } from "./home-content";
import AdminHomeContent from "./admin/_components/admin-home-content";
import { eventsService, eventKeys } from "@/services/common/events/events.service";

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  const theme = await fetchServerThemeCached(host);

  // Both admin and vendor/customer tenants get theme from API; titles come
  // from the layout's dynamic metadata. Add the home canonical + OG text here.
  if (theme) {
    const title = theme.seo?.title || `${theme.name || appConfig.name} | Event Management`;
    const description = theme.seo?.description || appConfig.seo.description;
    return {
      alternates: { canonical: "/" },
      openGraph: {
        type: "website",
        siteName: theme.name || appConfig.name,
        title,
        description,
        url: "/",
        ...(theme.logo ? { images: [{ url: theme.logo }] } : {}),
      },
    };
  }

  // Fallback only when API returns no theme (e.g. offline or unknown host).
  return {
    title: "Event Management",
    description: appConfig.seo.description,
    keywords: appConfig.seo.keywords,
  };
}

/**
 * Server entry: on the main marketing site, prefetch the blog teaser so the
 * article links are in the server HTML (news-section reads the same query).
 * Vendor storefronts render unchanged. HomeContent picks the homepage.
 */
export default async function HomePage() {
  const host = await getRequestHost();
  const theme = await fetchServerThemeCached(host);
  const isVendorHome =
    getSubdomainFromDomain(host) === "vendor" || theme?.website_role === "vendor";

  if (isVendorHome) {
    // Single-location vendor home renders the location inline (SingleLocationHome),
    // which otherwise fetches it client-side. Prefetch it on the server with the
    // SAME query key (getRequestHost() === client getDomain() hostname) so the
    // client reads from the hydrated cache instead of a waterfall. Additive:
    // if the key ever mismatches, the client simply fetches as before.
    const locations = theme?.locations ?? [];
    const singleSlug = locations.length === 1 ? locations[0]?.slug : undefined;
    if (singleSlug) {
      const vendorQc = new QueryClient();
      await vendorQc.prefetchQuery({
        queryKey: eventKeys.location(singleSlug, host),
        queryFn: () => eventsService.getLocationWithEvents(singleSlug, host),
        staleTime: 1000 * 60 * 5,
      });
      return (
        <Hydrate state={dehydrate(vendorQc)}>
          <HomeContent />
        </Hydrate>
      );
    }
    return <HomeContent />;
  }

  const queryClient = new QueryClient();
  const perPage = BLOG_HOME_PER_PAGE + 1; // same arguments as news-section
  await queryClient.prefetchQuery({
    // Must equal publicBlogKeys.list(perPage, 1) in services/common/blogs/query.ts
    // (not imported here: that module pulls in the browser axios client).
    queryKey: ["public", "blogs", "list", perPage, 1],
    queryFn: async () => {
      const posts = await fetchPublishedBlogs(host, perPage, 1);
      return { posts, total: posts.length };
    },
  });

  // Admin marketing home: server-rendered (static sections ship no JS), with
  // the blog teaser prefetched into the same React Query cache news-section reads.
  const content = resolveAdminHomeContent(theme as ThemeSchema);
  return (
    <main className="min-h-screen bg-[color:var(--color-background)] text-[color:var(--color-text)]">
      <Hydrate state={dehydrate(queryClient)}>
        <AdminHomeContent content={content} />
      </Hydrate>
    </main>
  );
}
