// Client-safe app configuration
// Note: This is a fallback config, actual branding comes from theme API
export const appConfig = {
  name: "Event Wizz", // Will be overridden by theme API data
  description:
    "Event Wizz is your ultimate companion for planning the wedding of your dreams. Discover venues, dresses, planning tools, and expert ideas to make your day unforgettable.",
  url: "https://event-wizz.com", // Static fallback, will be overridden by theme API
  links: {
    github: "https://github.com/event-wizz",
  },
  author: {
    name: "event-wizz",
    url: "https://event-wizz.com",
  },
  seo: {
    title: "Event Wizz - Plan the event of Your Dreams", // Will be overridden by theme API data
    description:
      "Your ultimate companion for planning the wedding of your dreams. Discover venues, dresses, planning tools, and expert ideas to make your day unforgettable.",
    keywords: [
      "wedding",
      "event wizz",
      "wedding planning",
      "venues",
      "wedding dresses",
      "planning tools",
      "wedding ideas",
    ],
    openGraph: {
      type: "website",
      url: "https://event-wizz.com", // Static fallback, will be overridden by theme API
      title: "Event Wizz - Plan the Venues of Your Dreams", // Will be overridden by theme API data
      description:
        "Your ultimate companion for planning the wedding of your dreams. Discover venues, dresses, planning tools, and expert ideas to make your day unforgettable.",
      images: [
        {
          url: "/images/og-image.jpg",
          width: 1200,
          height: 630,
          alt: "Event Management Platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Event Wizz - Plan the Wedding of Your Dreams", // Will be overridden by theme API data
      description:
        "Your ultimate companion for planning the wedding of your dreams. Discover venues, dresses, planning tools, and expert ideas to make your day unforgettable.",
      images: ["/images/twitter-image.jpg"],
      creator: "@eventwizz", 
    },
  },
};

export type SiteConfig = typeof appConfig;
