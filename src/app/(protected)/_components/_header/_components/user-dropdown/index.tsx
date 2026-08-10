import React, { memo, useMemo } from "react";
import { ChevronDown, CreditCard, Globe, LogOut, Settings, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useImpersonationStore } from "@/store/impersonation.store";
import { useExitImpersonation } from "@/hooks/useImpersonation";
import { logout } from "@/lib/auth/logout";
import { addCacheBusting } from "@/lib/image-utils";
import { PermissionGuard } from "@/components/permission/PermissionGuard";
import { toTitleCase } from "@/lib/utils";

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
  const isImpersonating = useImpersonationStore((s) => s.isImpersonating);
  const exitImpersonation = useExitImpersonation();
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
    let url = "/account/settings";

    if (user) {
      if (user.account_type === "admin") {
        url = "/admin/payment-settings";
      } else if (user.account_type === "vendor") {
        url = "/vendor/payment-settings";
      } else if (user.account_type === "customer") {
        url = "/customer/settings";
      }
    } else if (session?.user) {
      const accountType = session.user.account_type;

      if (accountType === "admin") {
        url = "/admin/payment-settings";
      } else if (accountType === "vendor") {
        url = "/vendor/payment-settings";
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

  const showSettings = accountType !== "customer";
  const isVendor = accountType === "vendor";
  const isAdmin = accountType === "admin";

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex items-center gap-2 bg-transparent text-[var(--color-on-header)] shadow-none hover:bg-transparent hover:text-[var(--color-on-header)]/90 pr-2">
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
                {toTitleCase(
                  user?.active_role || session?.user?.active_role || ""
                )}
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
              {isVendor || isAdmin ? (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <Settings size={16} className="mr-2" /> Settings
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48">
                    {isVendor && (
                      <>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => router.push("/vendor/domain-settings")}
                        >
                          <Globe size={15} className="mr-2 text-muted-foreground" />
                          Domain Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => router.push(settingsUrl)}
                    >
                      <CreditCard size={15} className="mr-2 text-muted-foreground" />
                      Payment Settings
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ) : (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push(settingsUrl)}
                >
                  <Settings size={16} className="mr-2" /> Settings
                </DropdownMenuItem>
              )}
            </PermissionGuard>
          )}
          {isImpersonating ? (
            <DropdownMenuItem
              className="cursor-pointer text-amber-700 focus:text-amber-700"
              onClick={() => exitImpersonation.mutate()}
              disabled={exitImpersonation.isPending}
            >
              <LogOut size={16} className="mr-2" /> Back to my account
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="cursor-pointer" onClick={() => logout()}>
              <LogOut size={16} className="mr-2" /> Log Out
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

UserDropdown.displayName = "UserDropdown";
export default UserDropdown;
