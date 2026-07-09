import { Suspense } from "react";
import SupportInbox from "../_components/support-inbox";

export default function CustomerSupportInboxPage() {
  return (
    <Suspense fallback={null}>
      <SupportInbox />
    </Suspense>
  );
}
