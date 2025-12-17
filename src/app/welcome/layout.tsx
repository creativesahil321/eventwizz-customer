import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { redirect } from "next/navigation";
import "@/assets/css/tailwind.css";

export default async function WelcomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Make sure user is authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/login");
  }

  // Only allow vendors to access welcome pages
  if (session.user.account_type !== "vendor") {
    redirect(`/${session.user.account_type}/dashboard`);
  }

  // Redirect to onboarding only if user has no location and is not onboarded
  // This prevents redirect loops during session updates
  if (
    session.user.isOnboarded === false &&
    (!session.user.vendor_location_id ||
      session.user.vendor_location_id === "null" ||
      session.user.vendor_location_id === "undefined")
  ) {
    redirect("/on-boarding");
  }

  return <div className="min-h-screen bg-white">{children}</div>;
}
