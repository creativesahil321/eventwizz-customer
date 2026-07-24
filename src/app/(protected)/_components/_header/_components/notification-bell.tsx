"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useProfileData } from "@/app/(protected)/_shared/profile/_lib";

type UserRole = "admin" | "vendor" | "customer";

export function NotificationBell() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user?.account_type as UserRole) || "vendor";
  const { data: profileResponse } = useProfileData({}, userRole);

  const unread =
    Number(
      profileResponse?.data?.notification_stats?.unread_notifications ?? 0,
    ) || 0;

  const handleClick = () => {
    switch (userRole) {
      case "admin":
        router.push("/admin/notifications");
        break;
      case "customer":
        router.push("/customer/notifications");
        break;
      case "vendor":
      default:
        router.push("/vendor/notifications");
        break;
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={handleClick}
      aria-label={`Notifications ${unread ? `(${unread} unread)` : ""}`}
    >
      <Bell className="h-5 w-5 text-[var(--color-on-header)]" />

      {unread > 0 && (
        <span
          className={cn(
            "absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
            "bg-[var(--color-primary)] text-[var(--color-background)]",
          )}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Button>
  );
}

export default NotificationBell;
