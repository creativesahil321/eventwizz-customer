"use client";

import { usePathname } from "next/navigation";
import Header from "./_header";
import CustomerHeader from "./_header/customer-header";
import { MenuItemProps } from "@/config/menus/types";
import { VendorGlobalAlerts } from "@/app/(protected)/vendor/_components/vendor-global-alerts";
import { useSession } from "next-auth/react";
import { useDomainStore } from "@/store/domain.store";
import { cn } from "@/lib/utils";
import { protectedSidebarOffsetClass } from "./protected-shell";

interface ConditionalHeaderProps {
  menus?: MenuItemProps[];
}

export default function ConditionalHeader({ menus }: ConditionalHeaderProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isVendor = session?.user?.account_type === "vendor";
  const { sidebarCollapsed: collapsed } = useDomainStore();

  if (pathname.startsWith("/customer")) {
    return <CustomerHeader menus={menus} />;
  }

  // Banner + header share the same width as the main content (not over the sidebar)
  return (
    <div
      className={cn(
        "sticky top-0 z-40 min-w-0 transition-all duration-300",
        protectedSidebarOffsetClass(collapsed),
      )}
    >
      {isVendor ? <VendorGlobalAlerts /> : null}
      <Header menus={menus} />
    </div>
  );
}
