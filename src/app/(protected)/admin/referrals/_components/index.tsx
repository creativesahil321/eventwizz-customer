import { ProtectedPageHeader } from "@/app/(protected)/_components/page-header-card";

export default function Referrals() {
  return (
    <ProtectedPageHeader
      className="mb-4 min-w-0"
      title="Referrals"
      description="Manage and optimize your referral program to increase user engagement and revenue."
    />
  );
}
