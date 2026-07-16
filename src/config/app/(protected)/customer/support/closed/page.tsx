import { redirect } from "next/navigation";

export default function CustomerSupportClosedPage() {
  redirect("/customer/support/inbox?status=closed");
}
