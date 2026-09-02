"use client";

import { usePathname } from "next/navigation";

const PAGE_CONFIG: Record<string, { title: string; description: string }> = {
  "/customer/support/inbox": {
    title: "Inbox",
    description: "View and reply to your support enquiries.",
  },
  "/customer/support/new": {
    title: "New enquiry",
    description: "Raise a support enquiry with our team.",
  },
};

function getPageConfig(pathname: string) {
  if (PAGE_CONFIG[pathname]) return PAGE_CONFIG[pathname];
  if (pathname.startsWith("/customer/support/inbox/")) {
    return PAGE_CONFIG["/customer/support/inbox"];
  }
  return PAGE_CONFIG["/customer/support/inbox"];
}

export default function SupportPageTitle() {
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
