"use client";

import { usePathname } from "next/navigation";

const PAGE_CONFIG: Record<string, { title: string; description: string }> = {
  "/vendor/support/dashboard": {
    title: "Support",
    description: "Overview of your support conversations and team activity.",
  },
  "/vendor/support/inbox": {
    title: "Inbox",
    description: "View and manage customer support conversations.",
  },
  "/vendor/support/new": {
    title: "New enquiry",
    description: "Send a support ticket to EventWizz admin for help.",
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
      <h1 className="text-xl sm:text-2xl title-header font-bold text-black">
        {title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">
        {description}
      </p>
    </div>
  );
}
