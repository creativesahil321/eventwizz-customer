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
    title: "Policies",
    description: isVendor
      ? `Read the terms and conditions, privacy policy and refund policy for ${brand}.`
      : "Read EventWizz terms, privacy, and refund policies for using our event management platform.",
    alternates: { canonical: "/policies" },
  };
}

const VENDOR_POLICY_KEYS = [
  "terms_and_conditions",
  "privacy_policy",
  "refund_policy",
];

const ADMIN_POLICY_KEYS = [
  "privacy_policy",
  "terms_and_conditions",
  "cookie_policy",
  "refund_policy",
  "vendor_terms",
];

export default async function PoliciesPage() {
  const host = await getRequestHost();
  const subdomain = getSubdomainFromDomain(host);
  const theme = await fetchServerThemeCached(host);
  const isVendor = isVendorPublicSite(subdomain, theme);

  const contentByKey = await fetchInfoPagesHtml(
    isVendor ? "vendor" : "admin",
    isVendor ? VENDOR_POLICY_KEYS : ADMIN_POLICY_KEYS,
    host,
  );

  return (
    <Suspense fallback={<PageLoader />}>
      <PublicCmsPageGate page="policies" contentByKey={contentByKey} />
    </Suspense>
  );
}
