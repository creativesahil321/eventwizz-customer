import { Shell } from "@/components/shell";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { blogAdminPaths } from "@/lib/blogs";
import { BlogList } from "../../_shared/blog-management/_components/blog-list";

export default function BlogManagementPage() {
  return (
    <section className="page bg-[var(--color-background,#f3f4f6)]">
      <Shell>
        <section className="relative w-full">
          <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-white p-4 text-black shadow-md sm:mb-6 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
              <h1 className="title-header text-xl font-bold sm:text-2xl">
                Blog Management
              </h1>
              <Link
                href={blogAdminPaths.create}
                className="w-full shrink-0 sm:w-auto"
              >
                <Button
                  variant="event-primary"
                  className="flex w-full items-center justify-center gap-1 sm:w-auto"
                >
                  <PlusCircle className="mr-1 h-4 w-4" />
                  New blog
                </Button>
              </Link>
            </div>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Create and edit news articles shown on the public home page.
              Section titles (e.g. “Latest News & Articles”) are still managed
              in Site Essentials.
            </p>
          </div>

          <BlogList />
        </section>
      </Shell>
    </section>
  );
}
