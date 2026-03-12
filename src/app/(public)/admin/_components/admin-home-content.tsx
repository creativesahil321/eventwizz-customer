import AdminHeader from "./header";
import HeroSection from "./hero-section";
import WhatIsSection from "./what-is-section";
import TrustedBy from "./trusted-by";
import EventTypes from "./event-types";
import SellingPoints from "./selling-points";
import RevolutioniseSection from "./revolutionise-section";
import FAQSection from "./faq-section";
import NewsSection from "./news-section";
import AdminFooter from "./footer";

/**
 * Admin/main site landing content. Used by both:
 * - /admin route (server page with metadata)
 * - / route via HomeContent when subdomain/theme is admin
 */
export default function AdminHomeContent() {
  return (
    <>
      <AdminHeader />
      <HeroSection />
      <WhatIsSection />
      <TrustedBy />
      <EventTypes />
      <SellingPoints />
      <RevolutioniseSection />
      <FAQSection />
      <NewsSection />
      <AdminFooter />
    </>
  );
}
