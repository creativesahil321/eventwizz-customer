import { ServerRoleGuard } from "@/components/auth/ServerRoleGuard";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ServerRoleGuard allowedRoles={["vendor"]}>
      <section className="h-full w-full">{children}</section>
    </ServerRoleGuard>
  );
}
