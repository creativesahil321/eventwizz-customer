import { Shell } from "@/components/shell";
import React, { lazy } from "react";
import { NewsletterFormSkeleton } from "./_components/skeleton";
const NewsletterForm = lazy(async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return import("./_components/newsletter-form");
});

interface PageProps {
  searchParams: unknown;
}
export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  console.log(searchParams, "searchParams");
  return (
    <section className="page">
      <Shell className="gap-2">
        <React.Suspense fallback={<NewsletterFormSkeleton />}>
          <NewsletterForm />
        </React.Suspense>
      </Shell>
    </section>
  );
}
