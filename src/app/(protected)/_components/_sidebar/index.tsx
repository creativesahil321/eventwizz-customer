"use client";

import { MenuItemProps } from "@/config/menus/types";
import MenuItem from "./menu-item";
import Logo from "./logo";
import { useCallback, memo } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PermissionMenu } from "@/components/permission/permission-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useDomainStore } from "@/store/domain.store";
import { PROTECTED_SIDEBAR_CLASS } from "../protected-shell";

type SidebarProps = {
  menus: MenuItemProps[];
};

const Sidebar: React.FC<SidebarProps> = memo(({ menus }) => {
  const { sidebarCollapsed: collapsed, setSidebarCollapsed: setCollapsed } =
    useDomainStore();

  const handleMouseEnter = useCallback(
    () => setCollapsed(false),
    [setCollapsed]
  );
  const handleMouseLeave = useCallback(() => {
    if (!collapsed) {
      // setCollapsed(true)
    }
  }, [collapsed]);

  // Create a loading fallback component for the sidebar
  const LoadingSkeleton = () => (
    <div className="flex flex-col space-y-4 p-4">
      {Array(6)
        .fill(0)
        .map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
    </div>
  );

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "fixed z-50 h-full start-0 overflow-hidden border-r border-[var(--color-border)] bg-white shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)] transition-all duration-300 ease-in-out",
        PROTECTED_SIDEBAR_CLASS,
        collapsed ? "w-[60px]" : "w-[264px]"
      )}
    >
      <section className="relative flex flex-col h-full">
        <Logo collapsed={collapsed} />
        <ScrollArea className="h-full w-full">
          <div className="pb-4">
            <nav className="w-full">
              <PermissionMenu
                menus={menus}
                loadingFallback={<LoadingSkeleton />}
                render={(filteredMenus) => (
                  <ul className="flex flex-col space-y-0">
                    {filteredMenus.map((menu) => (
                      <MenuItem key={menu.id} menu={menu} />
                    ))}
                  </ul>
                )}
              />
            </nav>
          </div>
        </ScrollArea>
      </section>
    </aside>
  );
});

Sidebar.displayName = "Sidebar";
export default Sidebar;
