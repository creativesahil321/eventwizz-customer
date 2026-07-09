import { Suspense } from "react";
import AdminSupportInbox from "../../_components/support-inbox";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminSupportConversationPage(props: PageProps) {
  const { id } = await props.params;

  return (
    <Suspense fallback={null}>
      <AdminSupportInbox selectedId={id} />
    </Suspense>
  );
}
