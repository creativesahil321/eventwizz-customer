import { getServerSession } from "next-auth";
import Sidebar from "./_components/_sidebar";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/authOptions";
import { useMenus } from "@/hooks/useMenus";
import Header from "./_components/_header";
import PageWrapper from "./_components/_page-wrapper";
import Footer from "./_components/_footer";
import { appConfig } from "@/config/app";
import { cache } from "react";
import ClientLayoutWrapper from "./_components/client-layout-wrapper";
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
  const menusPromise = getCachedMenus();
  const session = await sessionPromise;
  if (!session?.user) {
    redirect("/auth/login");
  }
  const menus = await menusPromise;

  return (
    <section className="flex min-h-screen w-full min-w-0 flex-col bg-default-100 dark:bg-background overflow-hidden">
      <ClientLayoutWrapper>
        <Header menus={menus || []} />
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
