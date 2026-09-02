"use client";

import { useContext } from "react";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { resolveAdminHomeContent } from "@/lib/admin-cms-content";
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
 * Admin/main site landing content. Used by both:
 * - /admin route (server page with metadata)
 * - / route via HomeContent when subdomain/theme is admin
 *
 * Typography matches vendor public pages: body stack on the shell,
 * marketing titles via SiteHeading (--font-heading) inside sections.
 */
export default function AdminHomeContent() {
  const { theme } = useContext(ServerContext);
  const content = resolveAdminHomeContent(theme as ThemeSchema);

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
