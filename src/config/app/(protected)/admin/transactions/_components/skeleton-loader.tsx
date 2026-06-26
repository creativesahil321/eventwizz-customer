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

export function AdminTransactionsTableSkeleton({
  rowCount = 5,
  className,
}: {
  rowCount?: number;
  className?: string;
}) {
  const cellWidths = [
    "12rem",
    "16rem",
    "12rem",
    "12rem",
    "16rem",
    "20rem",
    "14rem",
    "10rem",
    "10rem",
    "10rem",
    "8rem",
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
                        <Skeleton className="h-6 w-16 rounded-full" />
                      ) : colIndex === 8 || colIndex === 9 ? (
                        <Skeleton className="h-6 w-20" />
                      ) : colIndex === 10 ? (
                        <div className="flex items-center justify-center">
                          <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                      ) : (
                        <Skeleton className="h-6 w-full" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <footer className="bg-background border w-full p-4 my-4 rounded-lg min-w-0">
          <div className="flex flex-col gap-2.5 min-w-0">
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 p-1 sm:gap-8">
              <Skeleton className="h-7 w-40 shrink-0" />
              <div className="flex items-center gap-4 sm:gap-6">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-7 w-20" />
                <div className="flex gap-2">
                  <Skeleton className="size-8" />
                  <Skeleton className="size-8" />
                  <Skeleton className="size-8" />
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
