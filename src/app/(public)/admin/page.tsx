import AdminHeader from "./_components/header";
import HeroSection from "./_components/hero-section";
import PlanningSoftware from "./_components/planning-software";
import QuickSetup from "./_components/quick-setup";
import EventTypes from "./_components/event-types";
import SellingPoints from "./_components/selling-points";
import SystemCompatibility from "./_components/system-compatibility";
import TrustedBy from "./_components/trusted-by";
import NewsSection from "./_components/news-section";
import AdminFooter from "./_components/footer";

export default function AdminSiteHomePage() {
  return (
    <>
      <AdminHeader />
      <HeroSection />
      <PlanningSoftware />
      <QuickSetup />
      <EventTypes />
      <SellingPoints />
      <SystemCompatibility />
      <TrustedBy />
      <NewsSection />
      <AdminFooter />
    </>
  );
}
