import { Metadata } from "next";
import AdminHeader from "@/app/(public)/admin/_components/header";
import AdminFooter from "@/app/(public)/admin/_components/footer";
import HowItWorksContent from "./_components/how-it-works-content";
import { appConfig } from "@/config/app";

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
    url: "/how-it-works",
    siteName: appConfig.name,
    images: appConfig.seo.openGraph.images,
    locale: "en_US",
    type: "website",
  },
  alternates: {
    canonical: "/how-it-works",
  },
};

export default function HowItWorksPage() {
  return (
    <>
      <AdminHeader />
      <main className="pt-24">
        <HowItWorksContent />
      </main>
      <AdminFooter />
    </>
  );
}
