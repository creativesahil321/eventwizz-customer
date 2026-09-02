import { ProtectedPageHeader } from "@/app/(protected)/_components/page-header-card";

export default function MarketingAnalytics() {
  return (
    <ProtectedPageHeader
      className="mb-4 min-w-0"
      title="Marketing Analytics"
      description="Analyze and optimize your marketing strategies to increase user engagement and revenue."
    />
  );
}
