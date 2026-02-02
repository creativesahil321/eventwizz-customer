"use client";

import { memo, useState, useMemo } from "react";
import { MenuItemProps } from "@/config/menus/types";
import MobileLogo from "./mobile-logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AlignLeft } from "lucide-react";
import MobileMenuItem from "./mobile-menu-item";
import { useSession } from "next-auth/react";
import { useLocationsQuery } from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { LocationSelector } from "@/components/location-selector";

interface MobileSidebarProps {
  menus?: MenuItemProps[];
}

const MobileSidebar: React.FC<MobileSidebarProps> = memo(({ menus = [] }) => {
  const [open, setOpen] = useState(false);
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

  const handleClose = () => {
    setTimeout(() => {
      setOpen(false);
    }, 500);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <AlignLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0 dark:border-r-1">
        <SheetHeader className="p-4 border-b dark:border-b-1">
          <SheetTitle>
            <MobileLogo />
          </SheetTitle>
        </SheetHeader>

        {/* Add Location Selector for mobile if user has multiple locations */}
        {isVendor && hasMultipleLocations && (
          <div className="p-4 border-b">
            <LocationSelector />
          </div>
        )}

        <nav className="w-full p-4 max-h-[calc(100vh-80px)] overflow-y-auto text-black">
          <ul className="flex flex-col space-y-0">
            {menus.map((menu) => (
              <MobileMenuItem
                key={menu.id || menu.title}
                menu={menu}
                onClose={handleClose}
              />
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
});

MobileSidebar.displayName = "MobileSidebar";
export default MobileSidebar;
