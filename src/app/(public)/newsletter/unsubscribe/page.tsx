import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import UnsubscribeView from "./_components/unsubscribe-view";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function NewsletterUnsubscribePage({
  searchParams,
}: PageProps) {
  const { token } = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[color:var(--color-primary)]" />
        </div>
      }
    >
      <UnsubscribeView token={token ?? ""} />
    </Suspense>
  );
}
