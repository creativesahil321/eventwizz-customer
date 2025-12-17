import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Page-level skeleton loader for the entire menu choices page
export function MenuChoicesPageSkeleton() {
  return (
    <div className="w-full relative">
      {/* Header and search bar skeleton */}
      <div className="p-6 bg-background mb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <Skeleton className="h-7 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-60" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      {/* Table skeleton */}
      <MenuChoicesTableSkeleton />
    </div>
  );
}

// Component-level skeleton for just the table part
export function MenuChoicesTableSkeleton({
  rowCount = 5,
  className,
}: {
  rowCount?: number;
  className?: string;
}) {
  // Column widths to match the actual table
  const cellWidths = [
    "10rem", // ID/Number column
    "40rem", // Menu name column
    "12rem", // Category column
    "12rem", // Event column
    "8rem", // Status column
    "8rem", // Actions column
  ];

  return (
    <div className={cn("w-full relative overflow-hidden", className)}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {cellWidths.map((width, index) => (
                <TableHead key={index} style={{ width, minWidth: width }}>
                  <Skeleton className="h-6 w-full" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <TableRow key={rowIndex} className="hover:bg-transparent">
                {cellWidths.map((width, colIndex) => (
                  <TableCell
                    key={`${rowIndex}-${colIndex}`}
                    style={{ width, minWidth: width }}
                  >
                    {colIndex === 4 ? (
                      // Status column with badge-like skeleton
                      <Skeleton className="h-6 w-16 rounded-full" />
                    ) : colIndex === 5 ? (
                      // Actions column with icon buttons
                      <div className="flex items-center justify-end gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    ) : (
                      // Regular text content
                      <Skeleton className="h-6 w-full" />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between px-2 py-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// Menu form skeleton for create/update forms
export function MenuFormSkeleton() {
  return (
    <div className="w-full space-y-6">
      {/* Menu Name field */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Description field */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-24 w-full" />
      </div>

      {/* Category dropdown */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Event dropdown */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Status toggle */}
      <div className="flex items-center space-x-2">
        <Skeleton className="h-6 w-10" />
        <Skeleton className="h-5 w-14" />
      </div>

      {/* Submit button */}
      <Skeleton className="h-10 w-full mt-4" />
    </div>
  );
}
