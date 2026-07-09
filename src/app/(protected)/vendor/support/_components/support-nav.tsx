"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUnreadVendorInboxCount } from "../_lib/mock-data";

const NAV_ITEMS = [
  {
    title: "Dashboard",
    href: "/vendor/support/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "Inbox",
    href: "/vendor/support/inbox",
    icon: Inbox,
    exact: false,
    showBadge: true,
  },
] as const;

function isNavActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function VendorSupportNav() {
  const pathname = usePathname();
  const unreadCount = getUnreadVendorInboxCount();

  return (
    <nav
      aria-label="Support navigation"
      className="flex min-w-0 w-full max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100/80 p-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] lg:w-auto lg:max-w-full lg:shrink-0 [&::-webkit-scrollbar]:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = isNavActive(pathname, item.href, item.exact);
        const Icon = item.icon;
        const badge =
          "showBadge" in item && item.showBadge && unreadCount > 0
            ? unreadCount
            : null;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all sm:gap-2 sm:px-3.5",
              active
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground,white)] shadow-sm"
                : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="whitespace-nowrap">{item.title}</span>
            {badge !== null && (
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-[var(--color-primary)] text-white"
                )}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
