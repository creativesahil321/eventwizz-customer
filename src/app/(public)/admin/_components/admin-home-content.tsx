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
 * Section copy is resolved from the theme (white-label keys) with the current
 * platform copy as fallback, so nothing breaks before the backend returns keys.
 */
export default function AdminHomeContent() {
  const { theme } = useContext(ServerContext);
  const content = resolveAdminHomeContent(theme as ThemeSchema);

  return (
    <>
      <AdminHeader />
      <HeroSection content={content.hero} />
      <WhatIsSection content={content.intro} />
      <TrustedBy content={content.partners} />
      <EventTypes content={content.audience} />
      <SellingPoints content={content.features} />
      <RevolutioniseSection content={content.showcase} />
      <NewsSection content={content.news} />
      <AdminFooter />
    </>
  );
}
