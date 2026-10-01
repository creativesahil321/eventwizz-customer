import { Metadata } from "next";
import AdminHeader from "@/app/(public)/admin/_components/header";
import AdminFooter from "@/app/(public)/admin/_components/footer";
import AboutContent from "./_components/about-content";
import { appConfig } from "@/config/app";
import { assertAdminPublicSite } from "@/lib/assert-admin-public-site";
import { fetchInfoPagesHtml } from "@/lib/server-info-pages";
import { SkipLink } from "@/components/public/skip-link";

export const metadata: Metadata = {
  title: "About Us - Event Management Platform",
  description:
    "EventWizz is passionate about helping UK businesses manage bookings, sell tickets online, and run events seamlessly from one easy-to-use dashboard.",
  keywords: [
    "about eventwizz",
    "event management platform UK",
    "event booking software",
    "venue event management",
  ],
  openGraph: {
    title: "About Us - EventWizz",
    description:
      "EventWizz helps UK venues manage events, sell tickets online, and keep customers happy from one simple dashboard.",
    url: `${appConfig.url}/about`,
  },
  alternates: {
    canonical: `${appConfig.url}/about`,
  },
};

export default async function AboutPage() {
  const host = await assertAdminPublicSite();
  const content = await fetchInfoPagesHtml("admin", ["about_page_content"], host);

  return (
    // Full-height column: on tall screens (TV / zoomed out) the footer stays at the bottom.
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <AdminHeader />
      <main id="main-content" className="flex-1 pt-24">
        <AboutContent contentHtml={content.about_page_content ?? null} />
      </main>
      <AdminFooter />
    </div>
  );
}
