import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface OAuthSkeletonProps {
  variant?: "default" | "compact";
}

export const OAuthSkeleton: React.FC<OAuthSkeletonProps> = ({ 
  variant = "default" 
}) => {
  if (variant === "compact") {
    return (
      <div className="space-y-2">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-4 text-muted-foreground">
            <Skeleton className="h-4 w-24" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default OAuthSkeleton;
