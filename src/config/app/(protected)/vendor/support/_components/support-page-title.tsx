"use client";

import { usePathname } from "next/navigation";
import { AllLocationsBadge } from "@/components/location-indicator";

const PAGE_CONFIG: Record<string, { title: string; description: string }> = {
  "/vendor/support/dashboard": {
    title: "Support",
    description:
      "Support for your whole account — not limited to the venue in the header.",
  },
  "/vendor/support/inbox": {
    title: "Inbox",
    description: "Conversations with EventWizz support across every venue.",
  },
  "/vendor/support/new": {
    title: "New enquiry",
    description: "Send a support ticket to the EventWizz team for help.",
  },
};

function getPageConfig(pathname: string) {
  if (PAGE_CONFIG[pathname]) return PAGE_CONFIG[pathname];
  if (pathname.startsWith("/vendor/support/inbox/")) {
    return PAGE_CONFIG["/vendor/support/inbox"];
  }
  return PAGE_CONFIG["/vendor/support/dashboard"];
}

export default function VendorSupportPageTitle() {
  const pathname = usePathname();
  const { title, description } = getPageConfig(pathname);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl sm:text-2xl title-header font-bold text-black">
          {title}
        </h1>
        <AllLocationsBadge />
      </div>
      <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">
        {description}
      </p>
    </div>
  );
}
