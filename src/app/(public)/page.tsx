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
import { Hydrate } from "./[locationSlug]/_components/hydration-provider";
import { HomeContent } from "./home-content";

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

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <HomeContent />
    </Hydrate>
  );
}
