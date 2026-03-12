import { Metadata } from "next";
import { appConfig } from "@/config/app";

export const metadata: Metadata = {
  title: "Event Management Software for Venues",
  description:
    "Event management and booking platform for UK venues. Create branded event sites, sell tickets and tables, collect menu choices—ready in 15 minutes. Built for Christmas, New Year & seasonal events.",
  keywords: [
    "event management software",
    "event management for venues",
    "UK event booking",
    "event ticketing for venues",
    "Christmas event tickets",
    "New Year event booking",
    "venue event website",
    "event booking platform",
  ],
  openGraph: {
    title: "Event Management Software for Venues | EventWizz",
    description:
      "Vendor-first event management for UK venues. Create your own branded site, sell tickets and tables—ready in 15 minutes.",
    url: "/",
    siteName: appConfig.name,
    images: appConfig.seo.openGraph.images,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Event Management Software for Venues | EventWizz",
    description:
      "Vendor-first event management for UK venues. Create your own branded site, sell tickets and tables—ready in 15 minutes.",
    images: appConfig.seo.twitter.images,
  },
  alternates: {
    canonical: "/",
  },
};

export { HomeContent as default } from "./home-content";
