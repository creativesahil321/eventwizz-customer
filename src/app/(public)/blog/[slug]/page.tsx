import { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminHeader from "@/app/(public)/admin/_components/header";
import AdminFooter from "@/app/(public)/admin/_components/footer";
import { appConfig } from "@/config/app";
import { assertAdminPublicSite } from "@/lib/assert-admin-public-site";
import {
  getBlogPostBySlug,
  getBlogPostSlugs,
  resolveBlogMeta,
} from "@/lib/blogs";
import BlogArticleContent from "./_components/blog-article-content";

interface BlogArticlePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getBlogPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

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
      url: `${appConfig.url}/blog/${post.slug}`,
      images: [{ url: post.cover_image }],
      type: "article",
    },
    alternates: {
      canonical: `${appConfig.url}/blog/${post.slug}`,
    },
  };
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  await assertAdminPublicSite();

  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <AdminHeader />
      <main className="pt-24 font-body text-[color:var(--color-text)]">
        <BlogArticleContent post={post} />
      </main>
      <AdminFooter />
    </>
  );
}
