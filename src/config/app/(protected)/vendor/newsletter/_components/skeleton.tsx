import { Skeleton } from "@/components/ui/skeleton";

export function NewsletterFormSkeleton() {
  return (
    <section className="w-full bg-background p-6 rounded-md relative">
      <header className="w-full mb-6">
        <Skeleton className="h-8 w-40" />
      </header>
      <main className="w-full relative">
        <form className="space-y-8 space-x-8 flex flex-col md:flex-row items-center">
          <div className="grid gap-2 w-full lg:min-w-64">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
          <div className="grid gap-2 w-full lg:min-w-64">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
          <div className="grid gap-2 w-full lg:min-w-64">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
          <div className="grid gap-2 w-full lg:min-w-64">
            <Skeleton className="h-4 w-40" />
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </form>
      </main>
    </section>
  );
}
