import type { Metadata } from "next";
import { appConfig } from "@/config/app";

export const metadata: Metadata = {
    metadataBase: new URL(appConfig.url),
    title: {
        default: appConfig.name,
        template: `%s - ${appConfig.name}`,
    },
    description: appConfig.description,
    keywords: [
        "venue booking",
        "event",
        "event wizz",
    ],
    authors: [
        {
            name: appConfig.author.name,
            url: appConfig.url,
        },
    ],
    creator: appConfig.author.name,
    openGraph: {
        type: "website",
        locale: "en_US",
        url: appConfig.url,
        title: appConfig.name,
        description: appConfig.description,
        siteName: appConfig.name,
    },
    twitter: {
        card: "summary_large_image",
        title: appConfig.name,
        description: appConfig.description,
        images: [`${appConfig.url}/og.jpg`],
        creator: "@eventwizz",
    },
    icons: {
        icon: "/icon.png",
    },
    manifest: `${appConfig.url}/site.webmanifest`,
};
