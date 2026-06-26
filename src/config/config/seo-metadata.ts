import type { Metadata } from "next";
import { appConfig } from "./app";

interface BuildMetadataOptions {
  id?: string;
  data: {
    title: string;
    description: string;
    keywords?: string[];
  };
  parentImages?: Metadata["openGraph"] extends { images?: string[] }
    ? Metadata["openGraph"]["images"]
    : string[];
  overrides?: Partial<Metadata>;
}

export function buildMetadata({
  id,
  data,
  parentImages = [],
  overrides = {},
}: BuildMetadataOptions): Metadata {
  // Normalize parentImages to always be an array
  const normalizedParentImages = Array.isArray(parentImages)
    ? parentImages
    : parentImages
    ? [parentImages]
    : [];

  const defaultMetadata: Metadata = {
    title: data.title,
    description: data.description,
    keywords: data.keywords ?? appConfig.seo.keywords,
    authors: [{ name: appConfig.author.name, url: appConfig.author.url }],
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    metadataBase: new URL(appConfig.url),
    alternates: id
      ? {
          canonical: `${appConfig.url}/${id}`,
        }
      : undefined,
    openGraph: {
      ...(appConfig.seo.openGraph ?? {}),
      type: (appConfig.seo.openGraph?.type ?? "website") as
        | "website"
        | "article"
        | "book"
        | "profile"
        | "music.song"
        | "music.album"
        | "music.playlist"
        | "music.radio_station"
        | "video.movie"
        | "video.episode"
        | "video.tv_show"
        | "video.other",
      url: id ? `${appConfig.url}/${id}` : appConfig.seo.openGraph?.url,
      title: data.title,
      description: data.description,
      images: [
        ...(Array.isArray(appConfig.seo.openGraph?.images)
          ? appConfig.seo.openGraph?.images
          : appConfig.seo.openGraph?.images
          ? [appConfig.seo.openGraph.images]
          : []),
        ...normalizedParentImages,
      ],
    } satisfies NonNullable<Metadata["openGraph"]>,

    twitter: {
      ...(appConfig.seo.twitter ?? {}),
      title: data.title,
      description: data.description,
    },
  };

  return {
    ...defaultMetadata,
    ...overrides,
    openGraph: {
      ...defaultMetadata.openGraph,
      ...overrides.openGraph,
    },
    twitter: {
      ...defaultMetadata.twitter,
      ...overrides.twitter,
    },
  };
}
