import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventPaginationProps {
  currentPage: number;
  setPage: (page: number) => void;
  totalPages: number;
}

export default function EventPagination({
  currentPage,
  setPage,
  totalPages,
}: EventPaginationProps) {
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setPage(page);
  };

  // Create an array of page numbers to display
  const getPageRange = () => {
    const range = [];

    // Always show first page
    range.push(1);

    // Calculate range around current page
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    // Add ellipsis after first page if needed
    if (startPage > 2) {
      range.push("ellipsis-start");
    }

    // Add pages around current page
    for (let i = startPage; i <= endPage; i++) {
      range.push(i);
    }

    // Add ellipsis before last page if needed
    if (endPage < totalPages - 1) {
      range.push("ellipsis-end");
    }

    // Always show last page if there are more than one page
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  // Don't show pagination if there's only one page
  if (totalPages <= 1) return null;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="gap-1 pl-2.5"
          >
            <ChevronsLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>
        </PaginationItem>

        {getPageRange().map((page, i) => (
          <PaginationItem key={`page-${page}-${i}`}>
            {page === "ellipsis-start" || page === "ellipsis-end" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                isActive={page === currentPage}
                onClick={() => handlePageChange(page as number)}
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="gap-1 pr-2.5"
          >
            <span>Next</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
