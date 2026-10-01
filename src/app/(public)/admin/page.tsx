import { Metadata } from "next";
import AdminHomeContent from "./_components/admin-home-content";
import { assertAdminPublicSite } from "@/lib/assert-admin-public-site";
import { fetchServerThemeCached } from "@/lib/server-theme";
import { resolveAdminHomeContent } from "@/lib/admin-cms-content";
import type { ThemeSchema } from "@/types/theme.types";

export const metadata: Metadata = {
  title: "Event Management Software for Venues",
  description:
    "Event management and booking platform for UK venues. Create branded event sites, sell tickets and tables, collect menu choices — ready in 15 minutes. Built for Christmas, New Year & seasonal events.",
  keywords: [
    "event management software",
    "event management for venues",
    "UK event booking",
    "event ticketing for venues",
    "Christmas event tickets",
    "New Year event booking",
    "venue event website",
    "event booking platform",
  ],
};

export default async function AdminSiteHomePage() {
  // The EventWizz marketing page must not be served on vendor domains
  // (duplicate content under the vendor's brand). 404 there, like /about and /blog.
  const host = await assertAdminPublicSite();
  const theme = await fetchServerThemeCached(host);
  const content = resolveAdminHomeContent(theme as ThemeSchema);
  return <AdminHomeContent content={content} />;
}
