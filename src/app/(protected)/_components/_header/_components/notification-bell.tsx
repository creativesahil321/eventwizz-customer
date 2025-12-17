"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notificationService } from "@/services/common/notification";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

// Define types locally to avoid case-sensitivity issues
interface NotificationStats {
  total: number;
  unread: number;
  categories: {
    [key: string]: number;
  };
}

type UserRole = "admin" | "vendor" | "customer";

export function NotificationBell() {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const router = useRouter();

  // Get user role from auth store
  const user = useAuthStore((state) => state.user);
  const userRole = user?.account_type as UserRole;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await notificationService.getNotificationStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch notification stats:", error);
      }
    };

    fetchStats();

    // Set up interval to refresh stats every minute
    const interval = setInterval(fetchStats, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    // Navigate to the correct role-specific notifications page
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
      aria-label={`Notifications ${
        stats?.unread ? `(${stats.unread} unread)` : ""
      }`}
    >
      <Bell className="h-5 w-5 text-[var(--color-text)] " />

      {/* Notification badge */}
      {stats && stats.unread && stats.unread > 0 && (
        <span
          className={cn(
            "absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
            "bg-[var(--color-primary)] text-[var(--color-background)]"
          )}
        >
          {stats.unread > 99 ? "99+" : stats.unread}
        </span>
      )}
    </Button>
  );
}

export default NotificationBell;
