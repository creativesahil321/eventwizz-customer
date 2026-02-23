import SharedSiteEssentialsPage from "@/app/(protected)/_shared/sites-essentials/page";
import { PermissionRoute } from "@/components/permission";

export default function VendorSiteEssentialsPage() {
  return (
    <PermissionRoute
      permissionKey="read-site-essential"
      fallbackPath="/vendor/dashboard"
    >
      <SharedSiteEssentialsPage />
    </PermissionRoute>
  );
}
