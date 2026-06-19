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

export function TransactionsTableSkeleton({
  rowCount = 5,
  className,
}: {
  rowCount?: number;
  className?: string;
}) {
  // Column widths to match the actual transactions table
  const cellWidths = [
    "12rem", // Booking Number
    "16rem", // Txn ID
    "12rem", // Booking Date
    "12rem", // Event Date
    "16rem", // Full Name
    "20rem", // Email
    "14rem", // Payment Method
    "10rem", // Status
    "10rem", // Amount
    "10rem", // Platform Fee
    "8rem", // Receipt
  ];

  return (
    <div className={cn("w-full relative overflow-hidden", className)}>
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-transparent">
                {cellWidths.map((width, index) => (
                  <TableHead
                    key={index}
                    className="font-semibold py-4 px-4"
                    style={{ width, minWidth: width }}
                  >
                    <Skeleton className="h-6 w-full" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="bg-background">
              {Array.from({ length: rowCount }).map((_, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  className="border-b hover:bg-transparent"
                >
                  {cellWidths.map((width, colIndex) => (
                    <TableCell
                      key={`${rowIndex}-${colIndex}`}
                      className="py-4 px-4"
                      style={{ width, minWidth: width }}
                    >
                      {colIndex === 7 ? (
                        // Status column with badge-like skeleton
                        <Skeleton className="h-6 w-16 rounded-full" />
                      ) : colIndex === 8 || colIndex === 9 ? (
                        // Amount and Platform Fee columns - slightly wider
                        <Skeleton className="h-6 w-20" />
                      ) : colIndex === 10 ? (
                        // Receipt column with icon button
                        <div className="flex items-center justify-center">
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
        <footer className="bg-background border w-full p-4 my-4 rounded-lg min-w-0">
          <div className="flex flex-col gap-2.5 min-w-0">
            <div className="flex items-center justify-between gap-4 overflow-auto p-1 sm:gap-8">
              <Skeleton className="h-7 w-40 shrink-0" />
              <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-24" />
                  <Skeleton className="h-7 w-[4.5rem]" />
                </div>
                <div className="flex items-center justify-center font-medium text-sm">
                  <Skeleton className="h-7 w-20" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="hidden size-7 lg:block" />
                  <Skeleton className="size-7" />
                  <Skeleton className="size-7" />
                  <Skeleton className="hidden size-7 lg:block" />
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
