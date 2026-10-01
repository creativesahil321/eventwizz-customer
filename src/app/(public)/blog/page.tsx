import { Metadata } from "next";
import AdminHeader from "@/app/(public)/admin/_components/header";
import AdminFooter from "@/app/(public)/admin/_components/footer";
import { appConfig } from "@/config/app";
import { assertAdminPublicSite } from "@/lib/assert-admin-public-site";
import { BLOG_LIST_PER_PAGE, blogPublicPaths } from "@/lib/blogs";
import { getPublishedBlogsForRequest } from "@/lib/blogs/public-api";
import BlogListingContent from "./_components/blog-listing-content";

export const metadata: Metadata = {
  title: "Blog - Latest News & Articles",
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
    url: `${appConfig.url}${blogPublicPaths.list}`,
  },
  alternates: {
    canonical: `${appConfig.url}${blogPublicPaths.list}`,
  },
};

export default async function BlogListingPage() {
  await assertAdminPublicSite();
  const articles = await getPublishedBlogsForRequest(BLOG_LIST_PER_PAGE, 1);

  return (
    <>
      <AdminHeader />
      <main className="pt-24">
        <BlogListingContent articles={articles} />
      </main>
      <AdminFooter />
    </>
  );
}
