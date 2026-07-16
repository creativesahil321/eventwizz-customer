import { Metadata } from "next";
import { Suspense } from "react";
import { PublicCmsPageGate } from "@/app/(public)/vendor/_components/cms-page/vendor-cms-page-gate";
import { appConfig } from "@/config/app";

export const metadata: Metadata = {
  title: "Policies - EventWizz",
  description:
    "Read EventWizz terms, privacy, and refund policies for using our event management platform.",
  alternates: {
    canonical: `${appConfig.url}/policies`,
  },
};

export default function PoliciesPage() {
  return (
    <Suspense fallback={null}>
      <PublicCmsPageGate page="policies" />
    </Suspense>
  );
}
