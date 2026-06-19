"use client";

import NotificationsPage from "../../_shared/notifications/page";
import { PermissionRoute } from "@/components/permission";

export default function VendorNotificationsPage() {
  return (
    <PermissionRoute
      permissionKey="read-notification"
      fallbackPath="/vendor/dashboard"
    >
      <NotificationsPage />
    </PermissionRoute>
  );
}
