import { ProtectedPageHeader } from "@/app/(protected)/_components/page-header-card";

export default function DisputeResolutionCentre() {
  return (
    <ProtectedPageHeader
      className="mb-4 min-w-0"
      title="Dispute Resolution Centre"
      description="Manage and resolve disputes between users and vendors efficiently."
    />
  );
}
