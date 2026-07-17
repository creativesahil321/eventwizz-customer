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
  title: "Policies - EventWizz",
  description:
    "Read EventWizz terms, privacy, and refund policies for using our event management platform.",
  alternates: {
    canonical: `${appConfig.url}/policies`,
  },
};

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
    <Suspense fallback={null}>
      <PublicCmsPageGate page="policies" contentByKey={contentByKey} />
    </Suspense>
  );
}
