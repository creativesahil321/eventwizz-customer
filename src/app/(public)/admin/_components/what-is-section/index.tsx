import type { AdminHomeContent } from "@/lib/admin-cms-content";
import { SiteHeading } from "@/components/public/site-heading";

export default function WhatIsSection({
  content,
}: {
  content: AdminHomeContent["intro"];
}) {
  return (
    <section className="py-20 bg-[color:var(--color-surface)]">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <SiteHeading
            level={2}
            title={content.title}
            variant="onSurface"
            align="center"
          />
        </div>
        <div
          className="space-y-6 text-[color:var(--color-text-dimmed)] text-base md:text-lg leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: content.body }}
        />
      </div>
    </section>
  );
}
