import type { Metadata } from "next";
import { appConfig } from "@/config/app";

export const metadata: Metadata = {
  metadataBase: new URL(appConfig.url),
  title: {
    default: appConfig.seo.title,
    template: `%s | ${appConfig.name}`,
  },
  description: appConfig.description,
  keywords: appConfig.seo.keywords,
  authors: [
    {
      name: appConfig.author.name,
      url: appConfig.url,
    },
  ],
  creator: appConfig.author.name,
  publisher: appConfig.author.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appConfig.url,
    title: appConfig.name,
    description: appConfig.description,
    siteName: appConfig.name,
    images: appConfig.seo.openGraph.images,
  },
  twitter: {
    card: "summary_large_image",
    title: appConfig.name,
    description: appConfig.description,
    images: appConfig.seo.twitter.images,
    creator: "@eventwizz",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/assets/images/logos/eventwizz-logo.png",
  },
  manifest: `${appConfig.url}/site.webmanifest`,
};
