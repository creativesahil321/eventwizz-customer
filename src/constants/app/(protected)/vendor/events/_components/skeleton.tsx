import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface PageSkeletonProps {
  count?: number;
}

export default function PageSkeleton({ count = 5 }: PageSkeletonProps) {
  return (
    <div className="bg-background border p-6 rounded-2xl">
      <Card className="shadow-none border-none px-0">
        <CardContent className="p-2">
          <div className="grid grid-cols-5 gap-6">
            {Array.from({ length: count }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse p-6 bg-white rounded-md shadow-2xl"
              >
                <div className="w-full h-48 bg-gray-300 rounded-md" />
                <div className="pt-2 mt-3 w-3/4 h-4 bg-gray-300 rounded-md" />
                <div className="pt-3 flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-300 rounded-full" />
                  <div className="w-20 h-4 bg-gray-300 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
