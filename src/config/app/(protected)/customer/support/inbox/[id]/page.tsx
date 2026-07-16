import { Suspense } from "react";
import SupportInbox from "../../_components/support-inbox";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerSupportConversationPage({
  params,
}: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={null}>
      <SupportInbox selectedId={id} />
    </Suspense>
  );
}
