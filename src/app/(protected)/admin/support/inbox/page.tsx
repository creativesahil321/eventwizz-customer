import { Suspense } from "react";
import AdminSupportInbox from "../_components/support-inbox";

export default function AdminSupportInboxPage() {
  return (
    <Suspense fallback={null}>
      <AdminSupportInbox />
    </Suspense>
  );
}
