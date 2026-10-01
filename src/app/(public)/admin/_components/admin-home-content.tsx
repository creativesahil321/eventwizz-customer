import type { AdminHomeContent as AdminHomeContentData } from "@/lib/admin-cms-content";
import AdminHeader from "./header";
import HeroSection from "./hero-section";
import WhatIsSection from "./what-is-section";
import TrustedBy from "./trusted-by";
import EventTypes from "./event-types";
import SellingPoints from "./selling-points";
import RevolutioniseSection from "./revolutionise-section";
import NewsSection from "./news-section";
import AdminFooter from "./footer";

/**
 * Admin/main site landing content. Server component: resolved CMS content is
 * passed in by the server page, so the static sections (what-is, trusted-by,
 * event-types, selling-points) render with zero client JS. Only the
 * interactive sections (header, hero, revolutionise, news, footer) are client
 * islands and hydrate.
 *
 * Used by /admin and / (admin host). Typography matches vendor public pages.
 */
export default function AdminHomeContent({
  content,
}: {
  content: AdminHomeContentData;
}) {
  return (
    <div className="font-body text-[color:var(--color-text)]">
      <AdminHeader />
      <HeroSection content={content.hero} />
      <WhatIsSection content={content.intro} />
      <TrustedBy content={content.partners} />
      <EventTypes content={content.audience} />
      <SellingPoints content={content.features} />
      <RevolutioniseSection content={content.showcase} />
      <NewsSection content={content.news} />
      <AdminFooter />
    </div>
  );
}
