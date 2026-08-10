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

  const headerClass =
    "flex-none min-w-0 w-full border-b border-slate-200 bg-[var(--color-header)] text-[var(--color-on-header)] px-4 py-3 md:px-6 md:py-4 flex items-center justify-between shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]";

  return (
    <header className={headerClass}>
      <div className="flex items-center gap-2 flex-1">
        <div className="md:hidden">
          <MobileSidebar menus={menus} />
        </div>
        <div className="hidden md:block">
          <LayoutToggle />
        </div>

        {/* Search Input */}
        <div className="relative max-w-md w-full">
          <UniversalSearch />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-1">
        {/* Vendor public site URL — copy / open live preview */}
        <div className="hidden lg:block">
          <VendorSiteUrl />
        </div>

        {/* Location Selector - Only show for vendors with multiple locations */}
        {isVendor && venueName && (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <div
                className="hidden lg:flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-background px-2.5 py-1.5 mr-1 max-w-[220px] min-w-0 cursor-default"
                aria-label={`Venue: ${venueName}`}
              >
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground shrink-0">
                  Venue:
                </span>
                <span className="text-sm font-semibold text-foreground truncate min-w-0">
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

        {/* Location Selector - Only show for vendors with multiple locations */}
        {isVendor && hasMultipleLocations && (
          <div className="hidden md:block mr-1">
            <LocationSelector />
          </div>
        )}

        {/* Help Dropdown */}
        <div className="hidden md:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="event-ghost"
                size="sm"
                className="hidden sm:flex"
              >
                <span className="mr-1">Help</span>
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Link
                  href="/documentation"
                  className="flex items-center w-full"
                >
                  Documentation
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/support" className="flex items-center w-full">
                  Support
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/faq" className="flex items-center w-full">
                  FAQs
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Create Event — always labeled so vendors recognise the action */}
        {isVendor && (
          <PermissionGuard permissionKey="create-event">
            <Link href="/vendor/events/create" className="shrink-0">
              <Button
                variant="event-primary"
                className="flex h-9 items-center gap-1.5 px-2.5 text-xs font-semibold sm:h-10 sm:gap-2 sm:px-4 sm:text-sm"
              >
                <PlusCircle size={16} className="shrink-0" />
                <span className="whitespace-nowrap">
                  <span className="sm:hidden">Create</span>
                  <span className="hidden sm:inline">Create Event</span>
                </span>
              </Button>
            </Link>
          </PermissionGuard>
        )}

        {/* Notification Bell - only when user can read notifications */}
        <PermissionGuard permissionKey="read-notification" fallback={null}>
          <NotificationBell />
        </PermissionGuard>

        {/* User Dropdown */}
        <UserDropdown />
      </div>
    </header>
  );
});

Header.displayName = "Header";
export default Header;
