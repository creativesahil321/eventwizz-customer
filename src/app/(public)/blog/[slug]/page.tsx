import { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminHeader from "@/app/(public)/admin/_components/header";
import AdminFooter from "@/app/(public)/admin/_components/footer";
import { appConfig } from "@/config/app";
import { assertAdminPublicSite } from "@/lib/assert-admin-public-site";
import { resolveBlogMeta, blogPublicPaths } from "@/lib/blogs";
import { getPublishedBlogBySlugForRequest } from "@/lib/blogs/public-api";
import BlogArticleContent from "./_components/blog-article-content";

interface BlogArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogBySlugForRequest(slug);

  if (!post) {
    return { title: "Article not found" };
  }

  const meta = resolveBlogMeta(post);

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${appConfig.url}${blogPublicPaths.article(post.slug)}`,
      images: post.cover_image ? [{ url: post.cover_image }] : undefined,
      type: "article",
    },
    alternates: {
      canonical: `${appConfig.url}${blogPublicPaths.article(post.slug)}`,
    },
  };
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  await assertAdminPublicSite();

  const { slug } = await params;
  const post = await getPublishedBlogBySlugForRequest(slug);

  if (!post) {
    notFound();
  }

  return (
    // Full-height column: on tall screens (TV / zoomed out) the footer stays at the bottom.
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <main className="flex-1 pt-24 font-body text-[color:var(--color-text)]">
        <BlogArticleContent post={post} />
      </main>
      <AdminFooter />
    </div>
  );
}
