// hooks/useMenus.ts
import { getServerSession } from "next-auth";
import { MenuItemProps } from "@/config/menus/types";
import { adminMenus, customerMenus, vendorMenus } from "@/config/menus";
import { authOptions } from "@/lib/auth/authOptions";

// Define a type that includes both current and legacy fields for backward compatibility
type SessionUserWithLegacy = {
  account_type?: string;
  type?: string; // Legacy field
};

export const useMenus = async (
  locale?: string,
  permissions?: string[]
): Promise<MenuItemProps[]> => {
  const session = await getServerSession(authOptions);

  // Cast user to include legacy fields for backward compatibility
  const user = session?.user as unknown as SessionUserWithLegacy;

  // Check for account_type first, fall back to type for backward compatibility
  if (!user?.account_type && !user?.type) {
    return []; // Return empty array if no user type (shouldn't happen due to redirect in layout)
  }

  // Use account_type with fallback to type for backward compatibility
  const userType = user.account_type || user.type;

  let menus: MenuItemProps[] = [];
  switch (userType) {
    case "admin":
      menus = adminMenus;
      break;
    case "vendor":
      menus = vendorMenus;
      break;
    case "customer":
      menus = customerMenus;
      break;
    default:
      menus = [];
  }

  if (permissions) {
    menus = menus
      .map((menu) => ({
        ...menu,
        menu: menu.menu?.filter((item) =>
          item.permissions ? permissions.includes(item.permissions) : true
        ),
      }))
      .filter((menu) => menu.menu && menu.menu.length > 0);
  }

  return menus;
};
