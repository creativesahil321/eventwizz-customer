import type { AdminHomeContent } from "@/lib/admin-cms-content";

export default function WhatIsSection({
  content,
}: {
  content: AdminHomeContent["intro"];
}) {
  return (
    <section className="py-20 bg-[color:var(--color-surface)]">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] text-center mb-8">
          {content.title}
        </h2>
        <div
          className="space-y-6 text-[color:var(--color-text-dimmed)] text-base md:text-lg leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: content.body }}
        />
      </div>
    </section>
  );
}
