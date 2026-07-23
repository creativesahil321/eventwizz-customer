import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/authOptions";
import { ServerRoleGuard } from "@/components/auth/ServerRoleGuard";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  // Enforce onboarding completion before granting access to any vendor route.
  // Mirrors the inverse guard in (on-boarding)/layout.tsx to avoid redirect loops.
  if (session.user.account_type === "vendor" && !session.user.isOnboarded) {
    redirect("/on-boarding");
  }

  return (
    <ServerRoleGuard allowedRoles={["vendor"]}>
      <section className="h-full w-full">{children}</section>
    </ServerRoleGuard>
  );
}
