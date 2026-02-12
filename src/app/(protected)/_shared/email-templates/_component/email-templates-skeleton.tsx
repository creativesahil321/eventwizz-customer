import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

// Skeleton matches current columns: Title, Who Received, When Do They Received, Edit/View Emails
export const EmailTemplatesSkeleton = () => {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i} className="h-16">
          <TableCell className="p-4">
            <Skeleton className="h-4 w-[140px]" />
          </TableCell>
          <TableCell className="p-4 hidden sm:table-cell">
            <Skeleton className="h-4 w-[80px]" />
          </TableCell>
          <TableCell className="p-4 hidden md:table-cell">
            <Skeleton className="h-4 w-[160px]" />
          </TableCell>
          <TableCell className="p-4 w-14 shrink-0">
            <Skeleton className="h-9 w-9 min-w-9 max-w-9 rounded-md shrink-0" />
          </TableCell>
          <TableCell className="p-4 w-14 shrink-0">
            <Skeleton className="h-9 w-9 min-w-9 max-w-9 rounded-md shrink-0" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};

export default EmailTemplatesSkeleton;
