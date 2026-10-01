import { Metadata } from "next";
import { Suspense } from "react";
import { PublicCmsPageGate } from "@/app/(public)/vendor/_components/cms-page/vendor-cms-page-gate";
import { PageLoader } from "@/components/ui/page-loader";
import { appConfig } from "@/config/app";
import {
  fetchServerThemeCached,
  getRequestHost,
  getSubdomainFromDomain,
} from "@/lib/server-theme";
import { isVendorPublicSite } from "@/lib/vendor-cms-content";
import { fetchInfoPagesHtml } from "@/lib/server-info-pages";

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();
  const theme = await fetchServerThemeCached(host);
  const isVendor = isVendorPublicSite(getSubdomainFromDomain(host), theme);
  const brand = theme?.name || appConfig.name;

  // Canonical is relative: metadataBase (root layout) resolves it to this
  // host, so vendor domains never point at the EventWizz domain.
  return {
    title: "Contact Us",
    description: isVendor
      ? `Get in touch with ${brand} about events, bookings and enquiries.`
      : "Get in touch with the EventWizz team for support, sales enquiries, or general questions about our event management platform.",
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage() {
  const host = await getRequestHost();
  const subdomain = getSubdomainFromDomain(host);
  const theme = await fetchServerThemeCached(host);
  const isVendor = isVendorPublicSite(subdomain, theme);

  const contentByKey = await fetchInfoPagesHtml(
    isVendor ? "vendor" : "admin",
    ["contact_page_content"],
    host,
  );

  return (
    <Suspense fallback={<PageLoader />}>
      <PublicCmsPageGate page="contact" contentByKey={contentByKey} />
    </Suspense>
  );
}
