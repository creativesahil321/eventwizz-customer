import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Sidebar from "./_components/_sidebar";
import { authOptions } from "@/lib/auth/authOptions";
import { useMenus } from "@/hooks/useMenus";
import ConditionalHeader from "./_components/conditional-header";
import PageWrapper from "./_components/_page-wrapper";
import Footer from "./_components/_footer";
import { appConfig } from "@/config/app";
import { cache } from "react";
import ClientLayoutWrapper from "./_components/client-layout-wrapper";
import { isDoorScanRequest } from "@/lib/auth/is-door-scan-request";
//import scss
import "@/assets/scss/app.scss";
const getCachedMenus = cache(async () => {
  return await useMenus();
});

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionPromise = getServerSession(authOptions);
  const doorScan = await isDoorScanRequest();
  const session = await sessionPromise;
  const accountType = session?.user?.account_type;
  if (doorScan && accountType !== "vendor") {
    return <>{children}</>;
  }
  if (!session?.user) {
    redirect("/auth/login");
  }
  const menus = await getCachedMenus();

  return (
    <section className="flex min-h-dvh w-full min-w-0 flex-col overflow-x-hidden bg-default-100 dark:bg-background">
      <ClientLayoutWrapper>
        <ConditionalHeader menus={menus || []} />
        <Sidebar menus={menus || []} />
        <PageWrapper>{children}</PageWrapper>
        <Footer
          copyrightYear={new Date().getFullYear()}
          companyName={appConfig.name}
          companyWebsite={appConfig.url}
        />
      </ClientLayoutWrapper>
    </section>
  );
}
