import { Metadata } from "next";
import AdminHeader from "@/app/(public)/admin/_components/header";
import AdminFooter from "@/app/(public)/admin/_components/footer";
import HowItWorksContent from "./_components/how-it-works-content";
import { appConfig } from "@/config/app";
import { assertAdminPublicSite } from "@/lib/assert-admin-public-site";
import { fetchInfoPagesHtml } from "@/lib/server-info-pages";
import { SkipLink } from "@/components/public/skip-link";

export const metadata: Metadata = {
  title: "How It Works - Event Management Process",
  description:
    "Learn how EventWizz works. Get started in 15 minutes with our streamlined event management process. From consultation to execution, we make event planning simple.",
  keywords: [
    "how eventwizz works",
    "event management process",
    "event planning steps",
    "how to use eventwizz",
    "event management guide",
  ],
  openGraph: {
    title: "How It Works - EventWizz",
    description:
      "Learn how EventWizz works. Get started in 15 minutes with our streamlined event management process.",
    url: `${appConfig.url}/how-it-works`,
  },
  alternates: {
    canonical: `${appConfig.url}/how-it-works`,
  },
};

export default async function HowItWorksPage() {
  const host = await assertAdminPublicSite();
  const content = await fetchInfoPagesHtml(
    "admin",
    ["how_it_works_page_content"],
    host,
  );

  return (
    // Full-height column: on tall screens (TV / zoomed out) the footer stays at the bottom.
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <AdminHeader />
      <main id="main-content" className="flex-1 pt-24">
        <HowItWorksContent
          contentHtml={content.how_it_works_page_content ?? null}
        />
      </main>
      <AdminFooter />
    </div>
  );
}
