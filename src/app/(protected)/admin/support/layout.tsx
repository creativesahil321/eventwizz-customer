import AdminSupportNav from "./_components/support-nav";
import AdminSupportPageTitle from "./_components/support-page-title";
import SupportWorkspaceChrome from "@/app/(protected)/_shared/support/support-workspace-chrome";

export default function AdminSupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SupportWorkspaceChrome
      title={<AdminSupportPageTitle />}
      nav={<AdminSupportNav />}
    >
      {children}
    </SupportWorkspaceChrome>
  );
}
