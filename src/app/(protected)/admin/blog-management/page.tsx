import { Shell } from "@/components/shell";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { BlogList } from "../../_shared/blog-management/_components/blog-list";

export default function BlogManagementPage() {
  return (
    <section className="page bg-[var(--color-background,#f3f4f6)]">
      <Shell>
        <section className="relative w-full">
          <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-white p-6 text-black shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="title-header text-2xl font-bold">
                Blog Management
              </h1>
              <Link href="/admin/blog-management/create" className="shrink-0">
                <Button
                  variant="event-primary"
                  className="flex items-center gap-1"
                >
                  <PlusCircle className="mr-1 h-4 w-4" />
                  New blog
                </Button>
              </Link>
            </div>
            <p className="mt-2 text-muted-foreground">
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
