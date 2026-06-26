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

// Page-level skeleton loader for the entire customers page
export function CustomersPageSkeleton() {
  return (
    <div className="w-full relative">
      {/* Header and search bar skeleton */}
      <div className="p-6 bg-background mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex flex-1 gap-3 items-center">
              <Skeleton className="h-10 w-60" />
              <Skeleton className="h-10 w-44" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <CustomersTableSkeleton />
    </div>
  );
}

// Component-level skeleton for just the table part
export function CustomersTableSkeleton({
  rowCount = 5,
  className,
}: {
  rowCount?: number;
  className?: string;
}) {
  // Column widths to match the actual customer table
  const cellWidths = [
    "8rem", // Select column
    "12rem", // ID column
    "16rem", // Username column
    "20rem", // Name column
    "24rem", // Email column
    "12rem", // Phone column
    "8rem", // Status column
    "12rem", // Created At column
    "12rem", // Actions column
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
                    {colIndex === 0 ? (
                      // Select column with checkbox skeleton
                      <Skeleton className="h-4 w-4 rounded" />
                    ) : colIndex === 6 ? (
                      // Status column with badge-like skeleton
                      <Skeleton className="h-6 w-16 rounded-full" />
                    ) : colIndex === 8 ? (
                      // Actions column with icon buttons
                      <div className="flex items-center justify-end gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
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

// Customer form skeleton for create/update forms
export function CustomerFormSkeleton() {
  return (
    <div className="w-full space-y-6">
      {/* First Name field */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Last Name field */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Email field */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Phone field */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-16" />
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
