import { Metadata } from "next";
import { Suspense } from "react";
import { PublicCmsPageGate } from "@/app/(public)/vendor/_components/cms-page/vendor-cms-page-gate";
import { appConfig } from "@/config/app";
import {
  fetchServerThemeCached,
  getRequestHost,
  getSubdomainFromDomain,
} from "@/lib/server-theme";
import { isVendorPublicSite } from "@/lib/vendor-cms-content";
import { fetchInfoPagesHtml } from "@/lib/server-info-pages";

export const metadata: Metadata = {
  title: "Contact Us - EventWizz",
  description:
    "Get in touch with the EventWizz team for support, sales enquiries, or general questions about our event management platform.",
  alternates: {
    canonical: `${appConfig.url}/contact`,
  },
};

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
    <Suspense fallback={null}>
      <PublicCmsPageGate page="contact" contentByKey={contentByKey} />
    </Suspense>
  );
}
