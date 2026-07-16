import { Suspense } from "react";
import VendorSupportInbox from "../../_components/support-inbox";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VendorSupportConversationPage({
  params,
}: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={null}>
      <VendorSupportInbox selectedId={id} />
    </Suspense>
  );
}
