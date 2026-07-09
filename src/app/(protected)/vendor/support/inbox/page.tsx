import { Suspense } from "react";
import VendorSupportInbox from "../_components/support-inbox";

export default function VendorSupportInboxPage() {
  return (
    <Suspense fallback={null}>
      <VendorSupportInbox />
    </Suspense>
  );
}
