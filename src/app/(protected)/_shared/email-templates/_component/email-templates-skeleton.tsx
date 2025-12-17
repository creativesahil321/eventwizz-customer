import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

// Skeleton component for the table rows when loading
export const EmailTemplatesSkeleton = () => {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i} className="h-16">
          <TableCell className="p-4">
            <Skeleton className="h-4 w-[120px]" />
          </TableCell>
          <TableCell className="p-4 hidden sm:table-cell">
            <Skeleton className="h-4 w-[80px]" />
          </TableCell>
          <TableCell className="p-4 hidden md:table-cell">
            <Skeleton className="h-4 w-[140px]" />
          </TableCell>
          <TableCell className="p-4 hidden sm:table-cell">
            <Skeleton className="h-4 w-[60px]" />
          </TableCell>
          <TableCell className="p-4">
            <Skeleton className="h-8 w-8 rounded-full" />
          </TableCell>
          <TableCell className="p-4">
            <Skeleton className="h-8 w-8 rounded-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};

export default EmailTemplatesSkeleton;
