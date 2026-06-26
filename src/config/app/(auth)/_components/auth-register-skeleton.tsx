import { Skeleton } from "@/components/ui/skeleton";

export function AuthRegisterSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center min-h-[300px]">
      <div className="flex flex-col items-center space-y-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
