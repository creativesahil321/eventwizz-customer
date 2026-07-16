import { Metadata } from "next";
import { Suspense } from "react";
import { PublicCmsPageGate } from "@/app/(public)/vendor/_components/cms-page/vendor-cms-page-gate";
import { appConfig } from "@/config/app";

export const metadata: Metadata = {
  title: "Contact Us - EventWizz",
  description:
    "Get in touch with the EventWizz team for support, sales enquiries, or general questions about our event management platform.",
  alternates: {
    canonical: `${appConfig.url}/contact`,
  },
};

export default function ContactPage() {
  return (
    <Suspense fallback={null}>
      <PublicCmsPageGate page="contact" />
    </Suspense>
  );
}
