import { Metadata } from "next";
import AdminHeader from "@/app/(public)/admin/_components/header";
import AdminFooter from "@/app/(public)/admin/_components/footer";
import { appConfig } from "@/config/app";
import { assertAdminPublicSite } from "@/lib/assert-admin-public-site";
import BlogListingContent from "./_components/blog-listing-content";

export const metadata: Metadata = {
  title: "Blog - Latest News & Articles | EventWizz",
  description:
    "Insights, tips, and best practices from the EventWizz team on event management, ticketing, and running venue events.",
  keywords: [
    "eventwizz blog",
    "event management tips",
    "venue events",
    "ticketing insights",
  ],
  openGraph: {
    title: "Blog - EventWizz",
    description:
      "Insights, tips, and best practices from the EventWizz team on event management and venue events.",
    url: `${appConfig.url}/blog`,
  },
  alternates: {
    canonical: `${appConfig.url}/blog`,
  },
};

export default async function BlogListingPage() {
  await assertAdminPublicSite();

  return (
    <>
      <AdminHeader />
      <main className="pt-24">
        <BlogListingContent />
      </main>
      <AdminFooter />
    </>
  );
}
