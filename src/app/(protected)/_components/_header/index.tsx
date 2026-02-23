"use client";

import { memo, useMemo } from "react";
import { useDomainStore } from "@/store/domain.store";
import LayoutToggle from "./_components/layout-toggle";
import { cn } from "@/lib/utils";
import UserDropdown from "./_components/user-dropdown";
import MobileSidebar from "./_components/mobile-sidebar";
import { MenuItemProps } from "@/config/menus/types";
import { Button } from "@/components/ui/button";
import { HelpCircle, PlusCircle } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UniversalSearch from "./_components/search";
import ReferralUrl from "./_components/referral";
import { PermissionGuard } from "@/components/permission";
import NotificationBell from "./_components/notification-bell";
import { LocationSelector } from "@/components/location-selector";
import { useSession } from "next-auth/react";
import { useLocationsQuery } from "@/app/(protected)/vendor/venue-locations/_lib/queries";

interface HeaderProps {
  menus?: MenuItemProps[];
}

const Header: React.FC<HeaderProps> = memo(({ menus }) => {
  const { sidebarCollapsed: collapsed } = useDomainStore();
  const { data: session } = useSession();
  const isVendor = session?.user?.account_type === "vendor";

  // Fetch locations to check count (only for vendors)
  // IMPORTANT: Only fetch if user is vendor to avoid 403 errors on customer pages
  const { data: locationsData } = useLocationsQuery(isVendor);
  const locationsList = useMemo(() => {
    if (!locationsData) return [];
    if (Array.isArray(locationsData)) return locationsData;
    return locationsData.data || [];
  }, [locationsData]);
  const hasMultipleLocations = locationsList.length > 1;

  const headerClass = useMemo(
    () =>
      cn(
        "flex-none min-w-0 bg-[var(--color-header)]  dark:border-b backdrop-blur-lg px-4 py-3 md:px-6 md:py-4 flex items-center justify-between sticky top-0 z-50 shadow-base transition-all duration-300 overflow-hidden",
        collapsed ? "xl:ml-[60px]" : "xl:ml-[264px]",
      ),
    [collapsed],
  );

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
        {/* Referral URL - Using the separate component */}
        <div className="hidden lg:block">
          <ReferralUrl />
        </div>

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

        {/* Create Event Button - Show on mobile too with icon only */}
        {isVendor && (
          <PermissionGuard permissionKey="create-event">
            <Link href="/vendor/events/create" className="md:hidden">
              <Button
                variant="event-primary"
                size="icon"
                aria-label="Create Event"
              >
                <PlusCircle size={18} />
              </Button>
            </Link>
          </PermissionGuard>
        )}

        {/* Create Event Button - Full button for tablets and up */}
        {isVendor && (
          <PermissionGuard permissionKey="create-event">
            <Link href="/vendor/events/create" className="hidden md:block">
              <Button
                variant="event-primary"
                className="flex items-center gap-2"
              >
                <PlusCircle size={16} />
                Create Event
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
