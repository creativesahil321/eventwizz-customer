import VendorSupportNav from "./_components/support-nav";
import VendorSupportPageTitle from "./_components/support-page-title";
import SupportWorkspaceChrome from "@/app/(protected)/_shared/support/support-workspace-chrome";

export default function VendorSupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SupportWorkspaceChrome
      title={<VendorSupportPageTitle />}
      nav={<VendorSupportNav />}
    >
      {children}
    </SupportWorkspaceChrome>
  );
}
