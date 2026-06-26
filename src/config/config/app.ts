export const appConfig = {
  name: "EventWizz",
  description:
    "EventWizz is a comprehensive event management platform for creating, managing and selling tickets for your events. Professional event planning software for all your event needs.",
  url: "https://eventwizz.co.uk",
  links: {
    github: "https://github.com/event-wizz",
  },
  author: {
    name: "EventWizz",
    url: "https://eventwizz.co.uk",
  },
  logo: "/assets/images/logos/eventwizz-logo.png",
  mini_logo: "/assets/images/logos/eventwizz-mini-logo.png",
  seo: {
    title:
      "EventWizz - Event Management Platform | Create, Manage & Sell Event Tickets",
    description:
      "EventWizz is a comprehensive event management platform for creating, managing and selling tickets for your events. Professional event planning software for all your event needs.",
    keywords: [
      "event management",
      "event planning software",
      "event ticketing",
      "event platform",
      "event management system",
      "online event management",
      "event registration",
      "event booking",
      "corporate events",
      "event planning",
    ],
    openGraph: {
      type: "website",
      url: "https://eventwizz.co.uk",
      title:
        "EventWizz - Event Management Platform | Create, Manage & Sell Event Tickets",
      description:
        "EventWizz is a comprehensive event management platform for creating, managing and selling tickets for your events. Professional event planning software for all your event needs.",
      images: [
        {
          url: "/assets/images/logos/eventwizz-logo.png",
          width: 1200,
          height: 630,
          alt: "EventWizz Event Management Platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title:
        "EventWizz - Event Management Platform | Create, Manage & Sell Event Tickets",
      description:
        "EventWizz is a comprehensive event management platform for creating, managing and selling tickets for your events. Professional event planning software for all your event needs.",
      images: ["/assets/images/logos/eventwizz-logo.png"],
      creator: "@eventwizz",
    },
  },
};

export type SiteConfig = typeof appConfig;
