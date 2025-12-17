import { Skeleton } from "@/components/ui/skeleton";

export function AuthRedirectingSkeleton() {
  return (
    <div className="fixed inset-0 bg-[var(--color-background,#e8f4f6)] flex items-center justify-center z-50">
      <div className="text-center flex flex-col items-center space-y-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}
