import { Suspense } from "react";
import AdminDashboardContent from "./_components/admin-dashboard-content";
import { PageLoader } from "@/components/ui/page-loader";

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminDashboardContent />
    </Suspense>
  );
}
