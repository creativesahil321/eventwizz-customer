import { ProtectedPageHeader } from "@/app/(protected)/_components/page-header-card";

export default function EmailLogs() {
  return (
    <ProtectedPageHeader
      className="mb-4 min-w-0"
      title="Email Logs"
      description="Track and analyze email campaigns and user interactions."
    />
  );
}
