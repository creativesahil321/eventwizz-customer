"use client";

import { memo, useMemo } from "react";
import LayoutToggle from "./_components/layout-toggle";
import UserDropdown from "./_components/user-dropdown";
import MobileSidebar from "./_components/mobile-sidebar";
import { MenuItemProps } from "@/config/menus/types";
import { Button } from "@/components/ui/button";
import { Building2, HelpCircle, PlusCircle } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UniversalSearch from "./_components/search";
import VendorSiteUrl from "./_components/vendor-site-url";
import { PermissionGuard } from "@/components/permission";
import NotificationBell from "./_components/notification-bell";
import { LocationSelector } from "@/components/location-selector";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "next-auth/react";
import { useLocationsQuery } from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { useProfileData } from "@/app/(protected)/_shared/profile/_lib";

interface HeaderProps {
  menus?: MenuItemProps[];
}

const Header: React.FC<HeaderProps> = memo(({ menus }) => {
  const { data: session } = useSession();
  const isVendor = session?.user?.account_type === "vendor";
  const accountType = session?.user?.account_type ?? "vendor";

  // Fetch locations to check count (only for vendors)
  // IMPORTANT: Only fetch if user is vendor to avoid 403 errors on customer pages
  const { data: locationsData } = useLocationsQuery(isVendor);
  const locationsList = useMemo(() => {
    if (!locationsData) return [];
    if (Array.isArray(locationsData)) return locationsData;
    return locationsData.data || [];
  }, [locationsData]);
  const hasMultipleLocations = locationsList.length > 1;
  const { data: profileData } = useProfileData({}, accountType);
  const venueName = useMemo(() => {
    if (!isVendor) return "";
    return (
      profileData?.data?.venue_name?.trim() || session?.user?.name?.trim() || ""
    );
  }, [isVendor, profileData?.data?.venue_name, session?.user?.name]);

  const helpSupportHref =
    accountType === "admin" ? "/admin/support" : "/vendor/support";

  const headerClass =
    "flex-none min-w-0 w-full border-b border-slate-200 bg-[var(--color-header)] text-[var(--color-on-header)] px-3 py-3 md:px-4 md:py-3 2xl:px-6 2xl:py-4 flex items-center gap-2 justify-between shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]";

  return (
    <header className={headerClass}>
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="md:hidden">
          <MobileSidebar menus={menus} />
        </div>
        <div className="hidden md:block">
          <LayoutToggle />
        </div>
        <UniversalSearch />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-1.5 2xl:gap-2">
        <VendorSiteUrl />

        {isVendor && venueName && (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <div
                className="hidden min-w-[9rem] max-w-[12rem] shrink-0 cursor-default items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-background px-2 py-1.5 lg:flex xl:max-w-[14rem] 2xl:max-w-[20rem] 2xl:px-2.5"
                aria-label={`Venue: ${venueName}`}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="hidden shrink-0 text-xs text-muted-foreground 2xl:inline">
                  Venue:
                </span>
                <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {venueName}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="end"
              sideOffset={6}
              className="max-w-[min(90vw,24rem)] border border-[var(--color-border)] shadow-md"
            >
              <span className="text-sm font-medium">{venueName}</span>
            </TooltipContent>
          </Tooltip>
        )}

        {isVendor && hasMultipleLocations && (
          <div className="hidden shrink-0 md:block">
            <LocationSelector />
          </div>
        )}

        <div className="hidden shrink-0 md:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="event-ghost"
                size="sm"
                className="px-2 2xl:px-3"
                aria-label="Help"
              >
                <span className="mr-1 hidden 2xl:inline">Help</span>
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/documentation">Documentation</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={helpSupportHref}>Support</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/faq">FAQs</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isVendor && (
          <PermissionGuard permissionKey="create-event">
            <Link href="/vendor/events/create" className="shrink-0">
              <Button
                variant="event-primary"
                className="flex h-9 items-center gap-1.5 px-2.5 text-xs font-semibold sm:h-10 sm:px-3 sm:text-sm 2xl:px-4"
              >
                <PlusCircle size={16} className="shrink-0" />
                <span className="whitespace-nowrap">
                  <span className="2xl:hidden">Create</span>
                  <span className="hidden 2xl:inline">Create Event</span>
                </span>
              </Button>
            </Link>
          </PermissionGuard>
        )}

        <PermissionGuard permissionKey="read-notification" fallback={null}>
          <NotificationBell />
        </PermissionGuard>

        <UserDropdown />
      </div>
    </header>
  );
});

Header.displayName = "Header";
export default Header;
