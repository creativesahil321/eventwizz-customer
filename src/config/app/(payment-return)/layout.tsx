import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/authOptions";
import "@/assets/scss/app.scss";

/**
 * Minimal layout for payment gateway return URLs (Stripe/PayPal/TrueLayer).
 * No header, sidebar, or footer — clean standalone page like onboarding return,
 * so the OAuth popup shows only the processing/success/error UI.
 */
export default async function PaymentReturnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <section className="flex min-h-screen w-full flex-col bg-gray-50">
      {children}
    </section>
  );
}
