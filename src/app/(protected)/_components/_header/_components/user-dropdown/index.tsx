import React, { memo, useMemo } from "react";
import { ChevronDown, LogOut, Settings, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { logout } from "@/lib/auth/logout";
import { addCacheBusting } from "@/lib/image-utils";
import { PermissionGuard } from "@/components/permission/PermissionGuard";

// Helper function to check if a URL is valid
const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const UserDropdown = memo(() => {
  const router = useRouter();
  const { data: session } = useSession();
  const user = useAuthStore((state) => state.user);
  const profileUrl = useMemo(() => {
    // Default profile URL
    let url = "/account/profile";

    // Try to determine profile URL from user/session data
    if (user) {
      if (user.account_type === "admin") {
        url = "/admin/profile";
      } else if (user.account_type === "vendor") {
        url = "/vendor/profile";
      } else if (user.account_type === "customer") {
        url = "/customer/profile";
      }
    } else if (session?.user) {
      // Extract from session as fallback
      const accountType = session.user.account_type;

      if (accountType === "admin") {
        url = "/admin/profile";
      } else if (accountType === "vendor") {
        url = "/vendor/profile";
      } else if (accountType === "customer") {
        url = "/customer/profile";
      }
    }

    return url;
  }, [user, session]);

  const settingsUrl = useMemo(() => {
    // Default settings URL
    let url = "/account/settings";

    // Try to determine settings URL from user/session data
    if (user) {
      if (user.account_type === "admin") {
        url = "/admin/settings";
      } else if (user.account_type === "vendor") {
        url = "/vendor/settings";
      } else if (user.account_type === "customer") {
        url = "/customer/settings";
      }
    } else if (session?.user) {
      // Extract from session as fallback
      const accountType = session.user.account_type;

      if (accountType === "admin") {
        url = "/admin/settings";
      } else if (accountType === "vendor") {
        url = "/vendor/settings";
      } else if (accountType === "customer") {
        url = "/customer/settings";
      }
    }

    return url;
  }, [user, session]);

  // If no user data from any source, don't render
  if (!user && !session?.user) return null;

  // Get user data from either source
  const userImage = user?.avatar || session?.user?.avatar;
  const userName = user?.first_name || session?.user?.first_name || "User";
  const userEmail = user?.email || session?.user?.email || "";
  const accountType = user?.account_type || session?.user?.account_type;

  // Hide Settings for customers; label "Payment Settings" for vendor, "Settings" for admin
  const showSettings = accountType !== "customer";
  const settingsLabel =
    accountType === "vendor" ? "Payment Settings" : "Settings";

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex items-center gap-2 bg-transparent text-[var(--color-text)] shadow-none hover:bg-transparent pr-2">
            {isValidUrl(userImage) ? (
              <img
                className="h-[32px] w-[32px] rounded-full object-cover"
                src={addCacheBusting(userImage as string)}
                alt="User Avatar"
              />
            ) : (
              <div className="h-[32px] w-[32px] rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-medium">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-start">
              <div className="flex items-center gap-1">
                <span className="hidden xl:block text-sm font-semibold">
                  {userName}
                </span>
                <ChevronDown size={16} />
              </div>
              <span className="hidden xl:block text-xs">
                {user?.active_role || session?.user?.active_role}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 border-b mb-1">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {userEmail}
            </p>
          </div>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => router.push(profileUrl)}
          >
            <UserIcon size={16} className="mr-2" /> Profile
          </DropdownMenuItem>
          {showSettings && (
            <PermissionGuard permissionKey="read-account" fallback={null}>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => router.push(settingsUrl)}
              >
                <Settings size={16} className="mr-2" /> {settingsLabel}
              </DropdownMenuItem>
            </PermissionGuard>
          )}
          <DropdownMenuItem className="cursor-pointer" onClick={() => logout()}>
            <LogOut size={16} className="mr-2" /> Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

UserDropdown.displayName = "UserDropdown";
export default UserDropdown;
