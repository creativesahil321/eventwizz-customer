import SupportNav from "./_components/support-nav";
import SupportPageTitle from "./_components/support-page-title";
import SupportWorkspaceChrome from "@/app/(protected)/_shared/support/support-workspace-chrome";

export default function CustomerSupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SupportWorkspaceChrome
      title={<SupportPageTitle />}
      nav={<SupportNav />}
    >
      {children}
    </SupportWorkspaceChrome>
  );
}
