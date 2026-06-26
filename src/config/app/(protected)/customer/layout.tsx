import { ServerRoleGuard } from "@/components/auth/ServerRoleGuard";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ServerRoleGuard allowedRoles={["customer"]}>
      <div className="w-full">{children}</div>
    </ServerRoleGuard>
  );
}
