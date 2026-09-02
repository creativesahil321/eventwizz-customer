import { ProtectedPageHeader } from "@/app/(protected)/_components/page-header-card";

export default function SalesMarketing() {
  return (
    <ProtectedPageHeader
      className="mb-4 min-w-0"
      title="Sales & Marketing"
      description="Manage and optimize your sales and marketing strategies."
    />
  );
}
