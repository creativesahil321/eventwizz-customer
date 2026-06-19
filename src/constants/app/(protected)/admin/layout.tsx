import { ServerRoleGuard } from "@/components/auth/ServerRoleGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ServerRoleGuard allowedRoles={["admin"]}>
      <section className="h-full w-full">{children}</section>
    </ServerRoleGuard>
  );
}
